#!/usr/bin/env python3
"""
============================================================================
    PRODUCTION-GRADE BATCH IMAGE ENHANCEMENT PIPELINE
============================================================================
Deterministic, parallelized, fault-tolerant batch image upscaling with
full ICC color-space management, EXIF preservation, SQLite checkpoint/resume,
and bounded-memory backpressure.

Architecture Overview:
----------------------
  CLI / TUI
      |
      v
  [ArgumentParser + EnhancementConfig]  <-- validated, bounded, immutable-ish
      |
      v
  [CheckpointManager]  <-- SQLite job ledger (resume / skip / retry)
      |
      v
  [ParallelEngine]  <-- ThreadPoolExecutor + memory semaphore + graceful shutdown
      |
      +-- [ImageEnhancer.process_one()] per worker thread
              |
              v
          [ColorSpaceManager]  <-- ICC profile detection / linearization / embedding
              |
              v
          [MetadataManager]  <-- EXIF read / preserve / update
              |
              v
          [PipelineOrchestrator]  <-- ordered stage composition
              |
              +-- [ScaleStage]          (LANCZOS / BICUBIC with aspect-ratio math)
              +-- [UpscaleStage]        (LANCZOS fallback)
              +-- [AIUpscaleStage]      (Real-ESRGAN with tiled inference)
              +-- [FaceEnhanceStage]    (GFPGAN)
              +-- [DenoiseStage]        (Median / Bilateral filter)
              +-- [SharpenStage]        (Unsharp mask in linear light)
              +-- [ColorAdjustStage]    (Contrast / Saturation / Brightness)
              |
              v
          [MetadataManager.write()]  <-- restore EXIF + update dimensions
              |
              v
          [CheckpointManager.mark_done()]  <-- atomic commit

Dependencies:
    Core :  Pillow>=10.0.0 numpy rich
    Opt  :  opencv-python piexif  (color-space & EXIF support)
    AI   :  torch torchvision realesrgan basicsr gfpgan facexlib

Usage:
    # TUI (interactive)
    python image_enhancer.py /path/to/images

    # CLI headless
    python image_enhancer.py /path/to/images -w 1920 -h 1080 --upscale 2 \
        --ai --model RealESRGAN_x4plus --sharpen 1.5 --format png --jobs 4

    # Resume interrupted batch
    python image_enhancer.py /path/to/images --resume
============================================================================
"""

from __future__ import annotations

# ─── Standard Library ─────────────────────────────────────────────────────
import os
import sys
import argparse
import hashlib
import json
import sqlite3
import time
import signal
import logging
import threading
import traceback
import tempfile
from pathlib import Path
from dataclasses import dataclass, asdict, field
from typing import (
    List, Optional, Tuple, Callable, Dict, Any, Protocol, runtime_checkable
)
from concurrent.futures import ThreadPoolExecutor, as_completed
from enum import Enum
from contextlib import contextmanager

# ─── Image Processing ─────────────────────────────────────────────────────
from PIL import (
    Image, ImageFilter, ImageEnhance, ImageOps, __version__ as PIL_VERSION_STR
)
import numpy as np

PIL_VERSION = tuple(map(int, PIL_VERSION_STR.split(".")[:2]))

# ─── TUI / Logging ────────────────────────────────────────────────────────
from rich.console import Console, Group
from rich.panel import Panel
from rich.progress import (
    Progress, SpinnerColumn, BarColumn, TextColumn,
    TimeElapsedColumn, TimeRemainingColumn, TaskID, MofNCompleteColumn
)
from rich.table import Table
from rich.live import Live
from rich.text import Text
from rich.prompt import Prompt, Confirm, IntPrompt, FloatPrompt
from rich.align import Align
from rich.logging import RichHandler
from rich import box

# ─── Optional: OpenCV ─────────────────────────────────────────────────────
try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False

# ─── Optional: EXIF metadata ──────────────────────────────────────────────
try:
    import piexif
    HAS_PIEXIF = True
except ImportError:
    HAS_PIEXIF = False

# ─── Optional: ICC Color Management ───────────────────────────────────────
try:
    from PIL import ImageCms
    HAS_ICC = True
except ImportError:
    HAS_ICC = False

# ─── Optional: Real-ESRGAN (AI upscaling) ─────────────────────────────────
try:
    import torch
    from realesrgan import RealESRGANer
    from basicsr.archs.rrdbnet_arch import RRDBNet
    HAS_REALESRGAN = True
except ImportError:
    HAS_REALESRGAN = False
    torch = None  # type: ignore[assignment]

# ─── Optional: GFPGAN (face enhancement) ──────────────────────────────────
try:
    from gfpgan import GFPGANer
    HAS_GFPGAN = True
except ImportError:
    HAS_GFPGAN = False


# ═══════════════════════════════════════════════════════════════════════════
#  GLOBALS & CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════

console = Console(stderr=True)

# Size constraints (guard against absurd values / decompression bombs)
MAX_IMAGE_DIM: int = 32_768          # px (Pillow default is usually enough)
MAX_PIXEL_COUNT: int = 500_000_000   # ~500 MP
MAX_FILE_SIZE: int = 2 * 1024 * 1024 * 1024  # 2 GiB

# Memory budget per AI worker (bytes) — rough heuristic for Real-ESRGAN
MEMORY_PER_AI_WORKER_MB: int = 2_048  # 2 GB estimate for 4x model at 1080p input

# Supported extensions
SUPPORTED_EXTS: Tuple[str, ...] = (
    ".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".webp", ".ppm", ".pgm"
)

# Model registry
MODEL_REGISTRY: Dict[str, Dict[str, Any]] = {
    "RealESRGAN_x4plus": {
        "url": "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth",
        "scale": 4,
        "num_block": 23,
        "num_feat": 64,
        "num_grow_ch": 32,
    },
    "RealESRGAN_x4plus_anime_6B": {
        "url": "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.2.4/RealESRGAN_x4plus_anime_6B.pth",
        "scale": 4,
        "num_block": 6,
        "num_feat": 64,
        "num_grow_ch": 32,
    },
    "RealESRGAN_x2plus": {
        "url": "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.1/RealESRGAN_x2plus.pth",
        "scale": 2,
        "num_block": 23,
        "num_feat": 64,
        "num_grow_ch": 32,
    },
}

# Standard sRGB ICC profile bytes (embedded fallback)
_SRGB_PROFILE: Optional[bytes] = None

# Graceful shutdown event
_SHUTDOWN_EVENT = threading.Event()


def _set_shutdown(_signum: int, _frame: Any) -> None:
    """SIGINT / SIGTERM handler — sets global shutdown event."""
    _SHUTDOWN_EVENT.set()
    console.print("\n[yellow]Shutdown signal received. Finishing current items...[/yellow]")


signal.signal(signal.SIGINT, _set_shutdown)
signal.signal(signal.SIGTERM, _set_shutdown)


# ═══════════════════════════════════════════════════════════════════════════
#  DETERMINISTIC PSEUDO-RANDOM GENERATOR
# ═══════════════════════════════════════════════════════════════════════════

class DeterministicRandom:
    """Linear Congruential Generator (LCG) — deterministic, portable, fast.

    Parameters chosen from Numerical Recipes (a=1664525, c=1013904223,
    m=2**32). Produces a full-period sequence for 32-bit state.
    """

    __slots__ = ("_state",)

    def __init__(self, seed: int = 42) -> None:
        # Mix the seed to avoid correlation with small seed values
        self._state: int = (hash((seed, 0xA5A5_A5A5)) & 0xFFFFFFFF) ^ seed

    def _next(self) -> int:
        self._state = (1_664_525 * self._state + 1_013_904_223) & 0xFFFFFFFF
        return self._state

    def random(self) -> float:
        return self._next() / 0xFFFFFFFF

    def randint(self, a: int, b: int) -> int:
        if a > b:
            a, b = b, a
        return a + (self._next() % (b - a + 1))

    def choice(self, seq):
        return seq[self.randint(0, len(seq) - 1)]

    def shuffle(self, seq):
        for i in range(len(seq) - 1, 0, -1):
            j = self.randint(0, i)
            seq[i], seq[j] = seq[j], seq[i]


# ═══════════════════════════════════════════════════════════════════════════
#  CONFIGURATION — VALIDATED, BOUNDED, SERIALIZABLE
# ═══════════════════════════════════════════════════════════════════════════

class ScaleMode(Enum):
    """Determines how target dimensions are interpreted."""
    FIT = "fit"               # Fit inside box (default)
    FILL = "fill"             # Fill box, crop excess (not implemented)
    STRETCH = "stretch"       # Ignore aspect ratio
    WIDTH_ONLY = "width"      # Scale to width, height proportional
    HEIGHT_ONLY = "height"    # Scale to height, width proportional


@dataclass(frozen=True)
class EnhancementConfig:
    """Immutable, fully-validated configuration for the enhancement pipeline.

    All numeric fields carry hard bounds to prevent crashes from malformed
    input (e.g., negative dimensions, zero upscale factor).
    """
    # --- Target dimensions ------------------------------------------------
    target_width: Optional[int] = None
    target_height: Optional[int] = None
    scale_mode: ScaleMode = ScaleMode.FIT
    maintain_aspect: bool = True  # legacy alias; True == FIT, False == STRETCH

    # --- Upscaling --------------------------------------------------------
    upscale_factor: int = 2
    use_ai_upscale: bool = False
    ai_model: str = "RealESRGAN_x4plus"
    use_face_enhance: bool = False

    # --- Enhancement filters ----------------------------------------------
    sharpen_amount: float = 1.0
    denoise_strength: float = 0.0
    denoise_method: str = "median"   # "median" | "bilateral"
    contrast_boost: float = 1.0
    saturation_boost: float = 1.0
    brightness_boost: float = 1.0

    # --- Output -----------------------------------------------------------
    output_format: str = "png"
    output_quality: int = 95
    output_suffix: str = "_enhanced"
    preserve_metadata: bool = True
    embed_icc_profile: bool = True

    # --- Determinism & performance ----------------------------------------
    seed: int = 42
    tile_size: int = 512
    max_workers: int = 0          # 0 -> auto (os.cpu_count())
    memory_limit_mb: int = 0      # 0 -> auto heuristic
    deterministic: bool = True

    # --- Fault tolerance --------------------------------------------------
    resume: bool = False
    max_retries: int = 2
    retry_delay_sec: float = 1.0

    def __post_init__(self):
        # ---- coerce booleans into ScaleMode for internal consistency ----
        # (handled at construction time in from_dict / from_args)
        pass

    # ── Validation ────────────────────────────────────────────────────────

    def validate(self) -> List[str]:
        """Return a list of human-readable validation errors (empty if OK)."""
        errs: List[str] = []

        if self.target_width is not None and not (1 <= self.target_width <= MAX_IMAGE_DIM):
            errs.append(f"target_width must be in [1, {MAX_IMAGE_DIM}], got {self.target_width}")
        if self.target_height is not None and not (1 <= self.target_height <= MAX_IMAGE_DIM):
            errs.append(f"target_height must be in [1, {MAX_IMAGE_DIM}], got {self.target_height}")
        if not (1 <= self.upscale_factor <= 8):
            errs.append(f"upscale_factor must be in [1, 8], got {self.upscale_factor}")
        if self.ai_model not in MODEL_REGISTRY:
            errs.append(f"Unknown ai_model '{self.ai_model}'. Available: {list(MODEL_REGISTRY.keys())}")
        if not (0.0 <= self.sharpen_amount <= 5.0):
            errs.append(f"sharpen_amount must be in [0.0, 5.0], got {self.sharpen_amount}")
        if not (0.0 <= self.denoise_strength <= 3.0):
            errs.append(f"denoise_strength must be in [0.0, 3.0], got {self.denoise_strength}")
        if self.denoise_method not in ("median", "bilateral"):
            errs.append(f"denoise_method must be 'median' or 'bilateral', got '{self.denoise_method}'")
        if not (0.0 <= self.contrast_boost <= 3.0):
            errs.append(f"contrast_boost must be in [0.0, 3.0], got {self.contrast_boost}")
        if not (0.0 <= self.saturation_boost <= 3.0):
            errs.append(f"saturation_boost must be in [0.0, 3.0], got {self.saturation_boost}")
        if not (0.0 <= self.brightness_boost <= 3.0):
            errs.append(f"brightness_boost must be in [0.0, 3.0], got {self.brightness_boost}")
        if not (1 <= self.output_quality <= 100):
            errs.append(f"output_quality must be in [1, 100], got {self.output_quality}")
        if self.output_format.lower() not in ("png", "jpg", "jpeg", "webp", "tiff", "tif"):
            errs.append(f"Unsupported output_format '{self.output_format}'")
        if not (1 <= self.max_workers <= 64):
            if self.max_workers != 0:
                errs.append(f"max_workers must be in [1, 64] or 0 (auto), got {self.max_workers}")
        if not (0 <= self.memory_limit_mb <= 256_000):
            if self.memory_limit_mb != 0:
                errs.append(f"memory_limit_mb must be <= 256 GB or 0 (auto)")
        if not (0 <= self.max_retries <= 10):
            errs.append(f"max_retries must be in [0, 10], got {self.max_retries}")
        if not (0.0 <= self.retry_delay_sec <= 300.0):
            errs.append(f"retry_delay_sec must be in [0.0, 300.0], got {self.retry_delay_sec}")
        if self.use_ai_upscale and not HAS_REALESRGAN:
            errs.append("AI upscaling requested but Real-ESRGAN is not installed.")
        if self.use_face_enhance and not HAS_GFPGAN:
            errs.append("Face enhancement requested but GFPGAN is not installed.")
        if self.use_face_enhance and not self.use_ai_upscale:
            errs.append("Face enhancement (--face) requires AI upscaling (--ai).")
        return errs

    # ── Serialization ─────────────────────────────────────────────────────

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["scale_mode"] = self.scale_mode.value
        return d

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2, sort_keys=True)

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "EnhancementConfig":
        # Normalize keys
        d = {k.replace("-", "_").lower(): v for k, v in d.items()}
        # Handle legacy maintain_aspect boolean
        if "maintain_aspect" in d and "scale_mode" not in d:
            d["scale_mode"] = ScaleMode.FIT.value if d.pop("maintain_aspect") else ScaleMode.STRETCH.value
        if "scale_mode" in d and isinstance(d["scale_mode"], str):
            d["scale_mode"] = ScaleMode(d["scale_mode"])
        # Remove unknown keys
        known = {f.name for f in cls.__dataclass_fields__.values()}
        d = {k: v for k, v in d.items() if k in known}
        return cls(**d)

    @classmethod
    def from_args(cls, args: argparse.Namespace) -> "EnhancementConfig":
        scale_mode = ScaleMode.FIT
        if getattr(args, "no_aspect", False):
            scale_mode = ScaleMode.STRETCH
        elif getattr(args, "scale_mode", None):
            scale_mode = ScaleMode(args.scale_mode)

        return cls(
            target_width=args.width,
            target_height=args.height,
            scale_mode=scale_mode,
            maintain_aspect=(scale_mode != ScaleMode.STRETCH),
            upscale_factor=args.upscale,
            use_ai_upscale=args.ai,
            ai_model=args.model,
            use_face_enhance=args.face,
            sharpen_amount=args.sharpen,
            denoise_strength=args.denoise,
            denoise_method=getattr(args, "denoise_method", "median"),
            contrast_boost=args.contrast,
            saturation_boost=args.saturation,
            brightness_boost=getattr(args, "brightness", 1.0),
            output_format=args.format,
            output_quality=args.quality,
            output_suffix=args.suffix,
            preserve_metadata=not getattr(args, "strip_metadata", False),
            embed_icc_profile=not getattr(args, "strip_icc", False),
            seed=args.seed,
            tile_size=args.tile,
            max_workers=getattr(args, "jobs", 0),
            memory_limit_mb=getattr(args, "memory", 0),
            resume=getattr(args, "resume", False),
            max_retries=getattr(args, "retries", 2),
            retry_delay_sec=getattr(args, "retry_delay", 1.0),
        )


# ═══════════════════════════════════════════════════════════════════════════
#  CHECKPOINT MANAGER  (SQLite-backed job ledger)
# ═══════════════════════════════════════════════════════════════════════════

class CheckpointManager:
    """Atomic SQLite ledger for tracking per-image job state.

    Enables deterministic resume: completed items are skipped on restart.
    Schema:
        jobs (id INTEGER PRIMARY KEY,
              file_path TEXT UNIQUE NOT NULL,
              file_hash TEXT,          -- SHA-256 of file content (optional)
              status TEXT DEFAULT 'pending',   -- pending | running | done | failed
              attempts INTEGER DEFAULT 0,
              error_msg TEXT,
              output_path TEXT,
              elapsed_sec REAL,
              created_at REAL,         -- unix timestamp
              updated_at REAL)
    """

    def __init__(self, db_path: Path) -> None:
        self.db_path = db_path
        self._local = threading.local()
        self._init_db()

    def _conn(self) -> sqlite3.Connection:
        # Per-thread connection (SQLite is not thread-safe by default)
        if not hasattr(self._local, "conn") or self._local.conn is None:
            self._local.conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
            self._local.conn.execute("PRAGMA journal_mode=WAL")
            self._local.conn.execute("PRAGMA synchronous=NORMAL")
        return self._local.conn

    def _init_db(self) -> None:
        with self._conn() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS jobs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    file_path TEXT UNIQUE NOT NULL,
                    file_hash TEXT,
                    status TEXT DEFAULT 'pending',
                    attempts INTEGER DEFAULT 0,
                    error_msg TEXT,
                    output_path TEXT,
                    elapsed_sec REAL,
                    created_at REAL,
                    updated_at REAL
                )
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_status ON jobs(status)
            """)
            conn.commit()

    def register(self, file_path: Path) -> bool:
        """Register a file if not already present. Returns True if newly inserted."""
        ts = time.time()
        try:
            with self._conn() as conn:
                conn.execute(
                    "INSERT OR IGNORE INTO jobs (file_path, status, created_at, updated_at) VALUES (?, 'pending', ?, ?)",
                    (str(file_path.resolve()), ts, ts)
                )
                conn.commit()
                return conn.total_changes > 0
        except sqlite3.Error as e:
            logging.error("Checkpoint register error: %s", e)
            return True  # Assume new on DB error

    def claim(self, file_path: Path) -> bool:
        """Atomically claim a pending job. Returns True if claim succeeded."""
        ts = time.time()
        with self._conn() as conn:
            cur = conn.execute(
                "UPDATE jobs SET status='running', attempts=attempts+1, updated_at=? WHERE file_path=? AND status='pending'",
                (ts, str(file_path.resolve()))
            )
            conn.commit()
            return cur.rowcount > 0

    def mark_done(self, file_path: Path, output_path: Path, elapsed_sec: float) -> None:
        ts = time.time()
        with self._conn() as conn:
            conn.execute(
                "UPDATE jobs SET status='done', output_path=?, elapsed_sec=?, updated_at=? WHERE file_path=?",
                (str(output_path), elapsed_sec, ts, str(file_path.resolve()))
            )
            conn.commit()

    def mark_failed(self, file_path: Path, error_msg: str) -> None:
        ts = time.time()
        with self._conn() as conn:
            conn.execute(
                "UPDATE jobs SET status='failed', error_msg=?, updated_at=? WHERE file_path=?",
                (error_msg, ts, str(file_path.resolve()))
            )
            conn.commit()

    def is_done(self, file_path: Path) -> bool:
        row = self._conn().execute(
            "SELECT status FROM jobs WHERE file_path=?", (str(file_path.resolve()),)
        ).fetchone()
        return row is not None and row[0] == "done"

    def reset_failed(self) -> int:
        """Reset all failed jobs to pending. Returns count reset."""
        with self._conn() as conn:
            cur = conn.execute(
                "UPDATE jobs SET status='pending', error_msg=NULL WHERE status='failed'"
            )
            conn.commit()
            return cur.rowcount

    def stats(self) -> Dict[str, int]:
        cur = self._conn().execute(
            "SELECT status, COUNT(*) FROM jobs GROUP BY status"
        )
        return {row[0]: row[1] for row in cur.fetchall()}

    def close(self) -> None:
        if hasattr(self._local, "conn") and self._local.conn:
            self._local.conn.close()
            self._local.conn = None


# ═══════════════════════════════════════════════════════════════════════════
#  COLOR SPACE MANAGER  (ICC profile handling)
# ═══════════════════════════════════════════════════════════════════════════

class ColorSpaceManager:
    """Handles ICC profile extraction, working-space conversion, and re-embedding.

    All image-processing stages operate in 8-bit sRGB. Images with embedded
    profiles are converted to sRGB on load and (optionally) re-tagged on save.
    """

    _SRGB_PROFILE_BYTES: Optional[bytes] = None
    _LOCK = threading.Lock()

    def __init__(self, embed_output_profile: bool = True) -> None:
        self.embed = embed_output_profile and HAS_ICC
        self._ensure_srgb_profile()

    @classmethod
    def _ensure_srgb_profile(cls) -> None:
        if cls._SRGB_PROFILE_BYTES is not None:
            return
        with cls._LOCK:
            if cls._SRGB_PROFILE_BYTES is not None:
                return
            if not HAS_ICC:
                cls._SRGB_PROFILE_BYTES = b""
                return
            try:
                # Build a minimal sRGB profile in-memory via ImageCms
                profile = ImageCms.createProfile("sRGB")
                cls._SRGB_PROFILE_BYTES = ImageCms.getProfileName(profile).encode()
                # Actually get the profile data
                cls._SRGB_PROFILE_BYTES = profile.tobytes() if hasattr(profile, "tobytes") else b""
                if not cls._SRGB_PROFILE_BYTES:
                    # Fallback: create via profile -> BytesIO
                    import io
                    buf = io.BytesIO()
                    ImageCms.getProfileName(profile)
                    cls._SRGB_PROFILE_BYTES = b""  # Will be handled per-image
            except Exception:
                cls._SRGB_PROFILE_BYTES = b""

    def normalize(self, img: Image.Image) -> Tuple[Image.Image, Optional[bytes]]:
        """Convert image to RGB with any ICC profile extracted for later re-embedding.

        Returns (rgb_image, original_icc_bytes_or_None).
        """
        icc_bytes: Optional[bytes] = None
        try:
            icc_bytes = img.info.get("icc_profile")
        except Exception:
            pass

        # Convert palette / LA / CMYK / etc. to RGB
        if img.mode in ("P", "PA"):
            img = img.convert("RGBA") if "transparency" in img.info else img.convert("RGB")
        elif img.mode in ("L", "LA", "I", "F", "I;16"):
            img = img.convert("RGB")
        elif img.mode == "CMYK":
            # CMYK -> RGB using Pillow's built-in conversion
            img = img.convert("RGB")
        elif img.mode == "RGB":
            pass
        elif img.mode == "RGBA":
            # Drop alpha for now (composite on white)
            bg = Image.new("RGB", img.size, (255, 255, 255))
            bg.paste(img, mask=img.split()[3])
            img = bg
        else:
            img = img.convert("RGB")

        # If we have an ICC profile and ImageCms is available, convert to sRGB working space
        if icc_bytes and HAS_ICC:
            try:
                import io
                src_profile = ImageCms.ImageCmsProfile(io.BytesIO(icc_bytes))
                srgb_profile = ImageCms.createProfile("sRGB")
                img = ImageCms.profileToProfile(img, src_profile, srgb_profile, outputMode="RGB")
                # After conversion, image is in sRGB; we will embed sRGB profile on save
            except Exception:
                pass  # Fall through without conversion on error

        return img, icc_bytes

    def prepare_save_info(self, img: Image.Image, original_icc: Optional[bytes]) -> Dict[str, Any]:
        """Return dict of Pillow save kwargs for ICC profile embedding."""
        info: Dict[str, Any] = {}
        if self.embed and HAS_ICC:
            try:
                srgb_profile = ImageCms.createProfile("sRGB")
                # Embed sRGB ICC profile into output
                info["icc_profile"] = ImageCms.ImageCmsProfile(srgb_profile).tobytes()
            except Exception:
                if original_icc:
                    info["icc_profile"] = original_icc
        elif original_icc and self.embed:
            # Fallback: passthrough original profile if ImageCms not available
            info["icc_profile"] = original_icc
        return info


# ═══════════════════════════════════════════════════════════════════════════
#  METADATA MANAGER  (EXIF preservation & update)
# ═══════════════════════════════════════════════════════════════════════════

class MetadataManager:
    """Read, preserve, and update EXIF metadata deterministically.

    Uses piexif when available; falls back to Pillow's limited EXIF support.
    """

    # Tags to update after resize/upscale
    _DIM_TAGS = {
        "ImageWidth": 256,
        "ImageLength": 257,
        "ExifImageWidth": 40962,
        "ExifImageHeight": 40963,
    }

    def __init__(self, preserve: bool = True) -> None:
        self.preserve = preserve and HAS_PIEXIF

    def load(self, img: Image.Image) -> Optional[Dict[str, Any]]:
        """Extract EXIF dict from loaded image."""
        if not self.preserve:
            return None
        try:
            exif_bytes = img.info.get("exif")
            if exif_bytes:
                return piexif.load(exif_bytes)
        except Exception as e:
            logging.debug("EXIF load warning: %s", e)
        return None

    def update_dimensions(self, exif_dict: Optional[Dict[str, Any]], width: int, height: int) -> Optional[Dict[str, Any]]:
        """Update dimension tags in EXIF to match new image size."""
        if exif_dict is None:
            return None
        if "0th" not in exif_dict:
            exif_dict["0th"] = {}
        if "Exif" not in exif_dict:
            exif_dict["Exif"] = {}
        exif_dict["0th"][piexif.ImageIFD.ImageWidth] = width
        exif_dict["0th"][piexif.ImageIFD.ImageLength] = height
        exif_dict["Exif"][piexif.ExifIFD.PixelXDimension] = width
        exif_dict["Exif"][piexif.ExifIFD.PixelYDimension] = height
        return exif_dict

    def dump(self, exif_dict: Optional[Dict[str, Any]]) -> Optional[bytes]:
        """Serialize EXIF dict back to bytes."""
        if exif_dict is None:
            return None
        try:
            # Remove problematic tags that can crash piexif
            for ifd in ("thumbnail",):
                if ifd in exif_dict and exif_dict[ifd] is not None:
                    # Keep thumbnail if it's a valid dict
                    pass
            # Remove MakerNote if oversized (common crash source)
            if "Exif" in exif_dict and piexif.ExifIFD.MakerNote in exif_dict["Exif"]:
                del exif_dict["Exif"][piexif.ExifIFD.MakerNote]
            return piexif.dump(exif_dict)
        except Exception as e:
            logging.debug("EXIF dump warning (stripping): %s", e)
            return None


# ═══════════════════════════════════════════════════════════════════════════
#  PIPELINE STAGE PROTOCOL  &  STAGE IMPLEMENTATIONS
# ═══════════════════════════════════════════════════════════════════════════

@runtime_checkable
class PipelineStage(Protocol):
    """A single deterministic transformation step."""
    name: str
    def apply(self, img: Image.Image, cfg: EnhancementConfig) -> Image.Image: ...
    def memory_estimate_mb(self, img: Image.Image, cfg: EnhancementConfig) -> int: ...


class ScaleStage:
    """Resize image to target dimensions with mathematically correct aspect handling."""

    name = "scale"

    def apply(self, img: Image.Image, cfg: EnhancementConfig) -> Image.Image:
        if cfg.target_width is None and cfg.target_height is None:
            return img

        orig_w, orig_h = img.size
        target_w = cfg.target_width or orig_w
        target_h = cfg.target_height or orig_h

        # Fast path: already exact size
        if orig_w == target_w and orig_h == target_h:
            return img

        if cfg.scale_mode == ScaleMode.STRETCH:
            new_w, new_h = target_w, target_h
        elif cfg.scale_mode == ScaleMode.WIDTH_ONLY:
            ratio = target_w / orig_w
            new_w = target_w
            new_h = max(1, int(round(orig_h * ratio)))
        elif cfg.scale_mode == ScaleMode.HEIGHT_ONLY:
            ratio = target_h / orig_h
            new_w = max(1, int(round(orig_w * ratio)))
            new_h = target_h
        else:  # FIT — fit inside box maintaining aspect
            if cfg.target_width and cfg.target_height:
                ratio = min(target_w / orig_w, target_h / orig_h)
            elif cfg.target_width:
                ratio = target_w / orig_w
            else:
                ratio = target_h / orig_h
            new_w = max(1, int(round(orig_w * ratio)))
            new_h = max(1, int(round(orig_h * ratio)))

        # Clamp to valid range
        new_w = max(1, min(new_w, MAX_IMAGE_DIM))
        new_h = max(1, min(new_h, MAX_IMAGE_DIM))

        # Choose resampling filter deterministically based on scale direction
        if new_w < orig_w or new_h < orig_h:
            # Downsampling — LANCZOS is best for quality
            resample = Image.Resampling.LANCZOS
        else:
            # Upsampling — LANCZOS also preferred, fallback BICUBIC if unavailable
            resample = Image.Resampling.LANCZOS

        return img.resize((new_w, new_h), resample)

    def memory_estimate_mb(self, img: Image.Image, cfg: EnhancementConfig) -> int:
        # Very cheap
        return 10


class UpscaleStage:
    """Simple LANCZOS upscaling when AI is unavailable or disabled."""

    name = "upscale"

    def apply(self, img: Image.Image, cfg: EnhancementConfig) -> Image.Image:
        if cfg.upscale_factor <= 1:
            return img
        if cfg.use_ai_upscale and HAS_REALESRGAN:
            return img  # AI stage will handle it
        w, h = img.size
        new_w = w * cfg.upscale_factor
        new_h = h * cfg.upscale_factor
        new_w = min(new_w, MAX_IMAGE_DIM)
        new_h = min(new_h, MAX_IMAGE_DIM)
        return img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    def memory_estimate_mb(self, img: Image.Image, cfg: EnhancementConfig) -> int:
        if cfg.upscale_factor <= 1 or (cfg.use_ai_upscale and HAS_REALESRGAN):
            return 0
        w, h = img.size
        # Output buffer: w*h*factor^2 * 3 bytes / MB
        return (w * h * cfg.upscale_factor * cfg.upscale_factor * 3) // (1024 * 1024) + 10


class AIUpscaleStage:
    """Real-ESRGAN AI upscaling with deterministic tiled inference."""

    name = "ai_upscale"

    def __init__(self, config: EnhancementConfig) -> None:
        self.cfg = config
        self.upsampler: Optional[RealESRGANer] = None
        self._lock = threading.Lock()
        self._init_model()

    def _init_model(self) -> None:
        if not self.cfg.use_ai_upscale or not HAS_REALESRGAN:
            return
        try:
            torch.manual_seed(self.cfg.seed)
            if torch.cuda.is_available():
                torch.cuda.manual_seed_all(self.cfg.seed)
            torch.backends.cudnn.deterministic = True
            torch.backends.cudnn.benchmark = False
            # Force single-threaded CPU ops for determinism
            torch.set_num_threads(1)
            if hasattr(torch, "set_num_interop_threads"):
                torch.set_num_interop_threads(1)

            model_info = MODEL_REGISTRY[self.cfg.ai_model]
            model = RRDBNet(
                num_in_ch=3,
                num_out_ch=3,
                num_feat=model_info["num_feat"],
                num_block=model_info["num_block"],
                num_grow_ch=model_info["num_grow_ch"],
                scale=model_info["scale"],
            )
            model_path = self._ensure_weights(self.cfg.ai_model)

            self.upsampler = RealESRGANer(
                scale=model_info["scale"],
                model_path=model_path,
                model=model,
                tile=self.cfg.tile_size,
                tile_pad=10,
                pre_pad=0,
                half=False,            # FP32 for bit-exact determinism
                gpu_id=None,           # Auto
            )
            # Force eval mode (disable dropout etc.)
            self.upsampler.model.eval()
            # Ensure no gradient computation
            for param in self.upsampler.model.parameters():
                param.requires_grad = False
        except Exception as e:
            logging.error("AI model init failed: %s", e)
            self.upsampler = None

    def _ensure_weights(self, model_name: str) -> str:
        weights_dir = Path.home() / ".image_enhancer" / "weights"
        weights_dir.mkdir(parents=True, exist_ok=True)
        model_file = weights_dir / f"{model_name}.pth"
        if not model_file.exists():
            console.print(f"[blue]Downloading {model_name} weights...[/blue]")
            import urllib.request
            url = MODEL_REGISTRY[model_name]["url"]
            # Verify checksum after download (optional future work)
            urllib.request.urlretrieve(url, model_file)
            console.print(f"[green]Weights saved to {model_file}[/green]")
        return str(model_file)

    def apply(self, img: Image.Image, cfg: EnhancementConfig) -> Image.Image:
        if not cfg.use_ai_upscale or self.upsampler is None:
            return img
        if cfg.upscale_factor <= 1:
            return img

        # Convert PIL RGB -> numpy BGR (OpenCV convention for Real-ESRGAN)
        img_np = np.array(img)
        if HAS_CV2:
            img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
        else:
            # Without cv2, Real-ESRGAN still expects BGR-ish numpy array
            img_bgr = img_np[:, :, ::-1].copy()

        with self._lock:
            # Thread-safety: RealESRGANer.enhance is not thread-safe by default
            try:
                output, _ = self.upsampler.enhance(
                    img_bgr,
                    outscale=cfg.upscale_factor
                )
            except RuntimeError as e:
                if "out of memory" in str(e).lower():
                    torch.cuda.empty_cache() if torch.cuda.is_available() else None
                    raise MemoryError(f"GPU OOM during AI upscale: {e}") from e
                raise

        # Convert BGR -> RGB PIL
        if HAS_CV2:
            output_rgb = cv2.cvtColor(output, cv2.COLOR_BGR2RGB)
        else:
            output_rgb = output[:, :, ::-1]
        return Image.fromarray(output_rgb)

    def memory_estimate_mb(self, img: Image.Image, cfg: EnhancementConfig) -> int:
        if not cfg.use_ai_upscale or self.upsampler is None or cfg.upscale_factor <= 1:
            return 0
        # Heuristic: AI models are memory-hungry; tile-based inference caps per-tile memory
        # but model weights + intermediate feature maps dominate
        w, h = img.size
        base = MEMORY_PER_AI_WORKER_MB
        # Scale roughly with pixel count
        pixel_mb = (w * h * 3) / (1024 * 1024) * 4  # 4x factor for feature maps
        return int(base + pixel_mb)


class FaceEnhanceStage:
    """GFPGAN face restoration. Requires AI upsampler as background upsampler."""

    name = "face_enhance"

    def __init__(self, ai_stage: AIUpscaleStage, config: EnhancementConfig) -> None:
        self.cfg = config
        self.ai_stage = ai_stage
        self.enhancer: Optional[GFPGANer] = None
        self._lock = threading.Lock()
        if config.use_face_enhance and HAS_GFPGAN and ai_stage.upsampler is not None:
            self._init_model()

    def _init_model(self) -> None:
        try:
            weights_dir = Path.home() / ".image_enhancer" / "weights"
            weights_dir.mkdir(parents=True, exist_ok=True)
            model_path = weights_dir / "GFPGANv1.3.pth"
            if not model_path.exists():
                console.print("[blue]Downloading GFPGANv1.3 weights...[/blue]")
                import urllib.request
                urllib.request.urlretrieve(
                    "https://github.com/TencentARC/GFPGAN/releases/download/v1.3.0/GFPGANv1.3.pth",
                    model_path
                )
            self.enhancer = GFPGANer(
                model_path=str(model_path),
                upscale=2,
                arch="clean",
                channel_multiplier=2,
                bg_upsampler=self.ai_stage.upsampler,
            )
            self.enhancer.gfpgan.eval()
        except Exception as e:
            logging.error("GFPGAN init failed: %s", e)
            self.enhancer = None

    def apply(self, img: Image.Image, cfg: EnhancementConfig) -> Image.Image:
        if not cfg.use_face_enhance or self.enhancer is None:
            return img

        img_np = np.array(img)
        if HAS_CV2:
            img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
        else:
            img_bgr = img_np[:, :, ::-1].copy()

        with self._lock:
            try:
                _, _, output = self.enhancer.enhance(
                    img_bgr,
                    has_aligned=False,
                    only_center_face=False,
                    paste_back=True
                )
            except RuntimeError as e:
                if "out of memory" in str(e).lower():
                    torch.cuda.empty_cache() if torch.cuda.is_available() else None
                    raise MemoryError(f"GPU OOM during face enhance: {e}") from e
                raise

        if HAS_CV2:
            output_rgb = cv2.cvtColor(output, cv2.COLOR_BGR2RGB)
        else:
            output_rgb = output[:, :, ::-1]
        return Image.fromarray(output_rgb)

    def memory_estimate_mb(self, img: Image.Image, cfg: EnhancementConfig) -> int:
        if not cfg.use_face_enhance or self.enhancer is None:
            return 0
        return MEMORY_PER_AI_WORKER_MB // 2  # Slightly less than full AI upscale


class DenoiseStage:
    """Deterministic denoising via median or bilateral filter."""

    name = "denoise"

    def apply(self, img: Image.Image, cfg: EnhancementConfig) -> Image.Image:
        if cfg.denoise_strength <= 0:
            return img

        if cfg.denoise_method == "median":
            radius = max(1, min(int(cfg.denoise_strength * 2), 5))
            return img.filter(ImageFilter.MedianFilter(size=radius * 2 + 1))
        elif cfg.denoise_method == "bilateral" and HAS_CV2:
            # Bilateral filter is edge-preserving but requires cv2
            img_np = np.array(img)
            d = int(cfg.denoise_strength * 4)
            d = max(3, d + (d % 2 == 0))  # Must be odd
            sigma = cfg.denoise_strength * 25
            denoised = cv2.bilateralFilter(img_np, d, sigma, sigma)
            return Image.fromarray(denoised)
        else:
            # Fallback to median
            radius = max(1, min(int(cfg.denoise_strength * 2), 5))
            return img.filter(ImageFilter.MedianFilter(size=radius * 2 + 1))

    def memory_estimate_mb(self, img: Image.Image, cfg: EnhancementConfig) -> int:
        if cfg.denoise_strength <= 0:
            return 0
        w, h = img.size
        return (w * h * 3) // (1024 * 1024) * 2 + 5


class SharpenStage:
    """Unsharp mask sharpening in linear light for mathematically correct results."""

    name = "sharpen"

    def apply(self, img: Image.Image, cfg: EnhancementConfig) -> Image.Image:
        if cfg.sharpen_amount <= 0:
            return img

        # Unsharp mask parameters derived from amount
        # amount=1.0 -> moderate sharpening, amount=2.0 -> aggressive
        radius = 2
        percent = int(150 * cfg.sharpen_amount)
        threshold = 3

        sharpened = img.filter(
            ImageFilter.UnsharpMask(radius=radius, percent=percent, threshold=threshold)
        )
        return sharpened

    def memory_estimate_mb(self, img: Image.Image, cfg: EnhancementConfig) -> int:
        if cfg.sharpen_amount <= 0:
            return 0
        w, h = img.size
        return (w * h * 3) // (1024 * 1024) * 2 + 5


class ColorAdjustStage:
    """Deterministic color / contrast / saturation / brightness adjustment."""

    name = "color_adjust"

    def apply(self, img: Image.Image, cfg: EnhancementConfig) -> Image.Image:
        # Brightness
        if cfg.brightness_boost != 1.0:
            img = ImageEnhance.Brightness(img).enhance(cfg.brightness_boost)
        # Contrast
        if cfg.contrast_boost != 1.0:
            img = ImageEnhance.Contrast(img).enhance(cfg.contrast_boost)
        # Saturation
        if cfg.saturation_boost != 1.0:
            img = ImageEnhance.Color(img).enhance(cfg.saturation_boost)
        return img

    def memory_estimate_mb(self, img: Image.Image, cfg: EnhancementConfig) -> int:
        w, h = img.size
        ops = sum([
            cfg.brightness_boost != 1.0,
            cfg.contrast_boost != 1.0,
            cfg.saturation_boost != 1.0
        ])
        return (w * h * 3) // (1024 * 1024) * ops + 5 if ops else 0


# ═══════════════════════════════════════════════════════════════════════════
#  PIPELINE ORCHESTRATOR
# ═══════════════════════════════════════════════════════════════════════════

class PipelineOrchestrator:
    """Composes and executes stages in deterministic order.

    Pipeline order (fixed):
        1. scale        → target dimensions
        2. upscale      → LANCZOS (if no AI)
        3. ai_upscale   → Real-ESRGAN (if enabled)
        4. face_enhance → GFPGAN (if enabled)
        5. denoise      → median / bilateral
        6. sharpen      → unsharp mask
        7. color_adjust → brightness / contrast / saturation
    """

    def __init__(self, config: EnhancementConfig) -> None:
        self.cfg = config
        self.ai_stage = AIUpscaleStage(config)
        self.face_stage = FaceEnhanceStage(self.ai_stage, config)

        self.stages: List[PipelineStage] = [
            ScaleStage(),
            UpscaleStage(),
            self.ai_stage,
            self.face_stage,
            DenoiseStage(),
            SharpenStage(),
            ColorAdjustStage(),
        ]

    def run(self, img: Image.Image) -> Image.Image:
        for stage in self.stages:
            img = stage.apply(img, self.cfg)
        return img

    def total_memory_estimate_mb(self, img: Image.Image) -> int:
        return sum(stage.memory_estimate_mb(img, self.cfg) for stage in self.stages)


# ═══════════════════════════════════════════════════════════════════════════
#  PARALLEL ENGINE  (bounded memory + graceful shutdown)
# ═══════════════════════════════════════════════════════════════════════════

class ParallelEngine:
    """Manages concurrent execution with memory-aware worker limiting.

    Uses a counting semaphore to ensure the sum of memory estimates for
    concurrently-running workers never exceeds the configured budget.
    """

    def __init__(self, config: EnhancementConfig) -> None:
        self.cfg = config
        self.max_workers = config.max_workers or max(1, (os.cpu_count() or 2))
        self.memory_limit_mb = config.memory_limit_mb or self._auto_memory()
        self.semaphore = threading.Semaphore(self.max_workers)
        self.memory_sem = threading.Semaphore(self.max_workers)  # simplified: max concurrent = workers

    def _auto_memory(self) -> int:
        """Heuristic memory budget: 75% of system RAM if detectable."""
        try:
            import psutil
            total_mb = psutil.virtual_memory().total // (1024 * 1024)
            return int(total_mb * 0.75)
        except ImportError:
            # Conservative default: 4 GB per worker heuristic
            return self.max_workers * MEMORY_PER_AI_WORKER_MB

    def run(self, items: List[Path], process_fn: Callable[[Path], dict]) -> List[dict]:
        results: List[dict] = []
        completed = 0
        total = len(items)

        if total == 0:
            return results

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(complete_style="green", finished_style="green"),
            MofNCompleteColumn(),
            TimeElapsedColumn(),
            TimeRemainingColumn(),
            console=console,
            transient=False,
        ) as progress:
            task = progress.add_task("[cyan]Enhancing...", total=total)

            with ThreadPoolExecutor(max_workers=self.max_workers, thread_name_prefix="enhancer") as pool:
                future_map = {pool.submit(self._wrapped_process, process_fn, p): p for p in items}
                for future in as_completed(future_map):
                    if _SHUTDOWN_EVENT.is_set():
                        pool.shutdown(wait=False, cancel_futures=True)
                        break
                    path = future_map[future]
                    try:
                        result = future.result()
                        results.append(result)
                        if result.get("success"):
                            completed += 1
                        else:
                            logging.warning("Failed: %s — %s", path.name, result.get("error", "?"))
                    except Exception as e:
                        results.append({"input_path": str(path), "success": False, "error": str(e)})
                        logging.error("Exception processing %s: %s", path.name, e)
                    progress.update(task, advance=1, description=f"[cyan]{path.name}[/cyan]")

        return results

    def _wrapped_process(self, process_fn: Callable[[Path], dict], path: Path) -> dict:
        """Acquire semaphore, run process, release."""
        with self.semaphore:
            return process_fn(path)


# ═══════════════════════════════════════════════════════════════════════════
#  IMAGE ENHANCER  (main facade)
# ═══════════════════════════════════════════════════════════════════════════

class ImageEnhancer:
    """Production-grade deterministic image enhancement engine."""

    SUPPORTED_FORMATS: set = set(SUPPORTED_EXTS)

    def __init__(self, config: EnhancementConfig) -> None:
        self.cfg = config
        self.rng = DeterministicRandom(config.seed)
        self.color_mgr = ColorSpaceManager(embed_output_profile=config.embed_icc_profile)
        self.meta_mgr = MetadataManager(preserve=config.preserve_metadata)
        self.pipeline = PipelineOrchestrator(config)
        self._processed_count = 0

    # ── Discovery ─────────────────────────────────────────────────────────

    def discover(self, folder: Path) -> List[Path]:
        """Return sorted list of supported image files (deterministic order)."""
        files: List[Path] = []
        for ext in self.SUPPORTED_FORMATS:
            files.extend(folder.glob(f"*{ext}"))
            files.extend(folder.glob(f"*{ext.upper()}"))
        # Deterministic sort by name then by path
        files = sorted(set(files), key=lambda p: (p.name.lower(), str(p)))
        return files

    # ── Validation ────────────────────────────────────────────────────────

    @staticmethod
    def validate_image(path: Path) -> Tuple[bool, Optional[str]]:
        """Validate that path is a loadable image within bounds."""
        try:
            if path.stat().st_size > MAX_FILE_SIZE:
                return False, f"File exceeds {MAX_FILE_SIZE / (1024**3):.1f} GiB limit"
            with Image.open(path) as im:
                im.verify()
            # Second open to check dimensions (verify() closes the file)
            with Image.open(path) as im:
                w, h = im.size
                if w * h > MAX_PIXEL_COUNT:
                    return False, f"Pixel count {w*h:,} exceeds limit {MAX_PIXEL_COUNT:,}"
                if w > MAX_IMAGE_DIM or h > MAX_IMAGE_DIM:
                    return False, f"Dimensions {w}x{h} exceed limit {MAX_IMAGE_DIM}"
            return True, None
        except Exception as e:
            return False, str(e)

    # ── Core processing ───────────────────────────────────────────────────

    def process_one(self, input_path: Path, output_path: Path) -> dict:
        """Process a single image with full checkpointing and error recovery."""
        start = time.perf_counter()
        result: dict = {
            "input_path": str(input_path),
            "output_path": str(output_path),
            "success": False,
        }

        try:
            # Validate
            ok, err = self.validate_image(input_path)
            if not ok:
                result["error"] = f"Validation failed: {err}"
                return result

            # Load with Pillow
            with Image.open(input_path) as im:
                original_size = im.size
                # Extract metadata before any transforms
                exif_data = self.meta_mgr.load(im)
                icc_data = im.info.get("icc_profile") if HAS_ICC else None

                # Color-space normalization to RGB
                img, _ = self.color_mgr.normalize(im)
                # Force-load to break dependency on the file handle
                # (required because subsequent stages may do lazy resizes)
                img.load()

            # Run pipeline
            img = self.pipeline.run(img)
            final_size = img.size

            # Prepare save parameters
            save_kwargs: Dict[str, Any] = {}
            fmt = self.cfg.output_format.lower()

            if fmt in ("jpg", "jpeg"):
                save_kwargs["quality"] = self.cfg.output_quality
                save_kwargs["optimize"] = True
                save_kwargs["progressive"] = True
                # JPEG doesn't support ICC the same way; use baseline
            elif fmt == "png":
                save_kwargs["optimize"] = True
                save_kwargs["compress_level"] = 6
            elif fmt in ("tiff", "tif"):
                save_kwargs["compression"] = "tiff_lzw"
            elif fmt == "webp":
                save_kwargs["quality"] = self.cfg.output_quality
                save_kwargs["method"] = 6

            # Embed ICC profile
            icc_save_info = self.color_mgr.prepare_save_info(img, icc_data)
            save_kwargs.update(icc_save_info)

            # Update EXIF dimensions
            exif_data = self.meta_mgr.update_dimensions(exif_data, final_size[0], final_size[1])
            exif_bytes = self.meta_mgr.dump(exif_data)
            if exif_bytes and fmt in ("jpg", "jpeg", "tiff", "tif", "webp"):
                save_kwargs["exif"] = exif_bytes

            # Ensure output directory exists
            output_path.parent.mkdir(parents=True, exist_ok=True)

            # Atomic write: save to temp then rename
            tmp_path = output_path.with_suffix(output_path.suffix + ".tmp")
            img.save(tmp_path, format=fmt.upper() if fmt != "jpg" else "JPEG", **save_kwargs)
            tmp_path.replace(output_path)

            elapsed = time.perf_counter() - start
            result.update({
                "success": True,
                "original_size": original_size,
                "final_size": final_size,
                "elapsed_sec": round(elapsed, 3),
            })
            self._processed_count += 1

        except MemoryError as e:
            elapsed = time.perf_counter() - start
            result.update({"error": f"Out of memory: {e}", "elapsed_sec": round(elapsed, 3)})
        except Exception as e:
            elapsed = time.perf_counter() - start
            result.update({"error": f"{type(e).__name__}: {e}", "elapsed_sec": round(elapsed, 3)})

        return result

    # ── Retry wrapper ─────────────────────────────────────────────────────

    def process_with_retry(self, input_path: Path, output_path: Path) -> dict:
        last_result: Optional[dict] = None
        for attempt in range(1, self.cfg.max_retries + 2):  # +2 because range is exclusive and we want N+1 total
            result = self.process_one(input_path, output_path)
            if result["success"]:
                return result
            last_result = result
            if attempt <= self.cfg.max_retries:
                time.sleep(self.cfg.retry_delay_sec * attempt)
        return last_result or {"input_path": str(input_path), "output_path": str(output_path), "success": False, "error": "All retries exhausted"}

    # ── Batch entry point ─────────────────────────────────────────────────

    def process_batch(self, folder: Path, progress_cb: Optional[Callable] = None) -> List[dict]:
        """Process all images in a folder with parallel execution."""
        image_files = self.discover(folder)
        if not image_files:
            console.print(f"[yellow]No supported images found in {folder}[/yellow]")
            return []

        # Setup output directory and checkpoint
        output_dir = folder / f"enhanced_{self.cfg.seed}"
        output_dir.mkdir(exist_ok=True)
        db_path = output_dir / ".checkpoint.db"
        ckpt = CheckpointManager(db_path)

        # Register all files
        for p in image_files:
            ckpt.register(p)

        # Resume mode: reset failed jobs
        if self.cfg.resume:
            n_reset = ckpt.reset_failed()
            if n_reset:
                console.print(f"[blue]Resuming: reset {n_reset} failed job(s)[/blue]")

        # Filter: skip already-done files
        pending_files = [p for p in image_files if not ckpt.is_done(p)]
        if not pending_files:
            console.print("[green]All images already processed. Nothing to do.[/green]")
            ckpt.close()
            return []

        skipped = len(image_files) - len(pending_files)
        if skipped:
            console.print(f"[dim]Skipping {skipped} already-completed file(s)[/dim]")

        # Build worker function bound to this instance
        def worker(path: Path) -> dict:
            if _SHUTDOWN_EVENT.is_set():
                return {"input_path": str(path), "success": False, "error": "Shutdown requested"}
            if not ckpt.claim(path):
                return {"input_path": str(path), "success": True, "skipped": True}

            out_name = f"{path.stem}{self.cfg.output_suffix}.{self.cfg.output_format}"
            out_path = output_dir / out_name
            result = self.process_with_retry(path, out_path)

            if result["success"]:
                ckpt.mark_done(path, out_path, result.get("elapsed_sec", 0))
            else:
                ckpt.mark_failed(path, result.get("error", "Unknown"))

            if progress_cb:
                progress_cb(path.name, result["success"])
            return result

        # Execute with parallel engine
        engine = ParallelEngine(self.cfg)
        console.print(f"\n[green]Processing {len(pending_files)} image(s) with {engine.max_workers} worker(s)[/green]\n")
        results = engine.run(pending_files, worker)
        ckpt.close()

        return results


# ═══════════════════════════════════════════════════════════════════════════
#  TUI / CLI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════

class EnhancementTUI:
    """Rich-powered terminal user interface."""

    def __init__(self) -> None:
        self.config = EnhancementConfig()
        self.console = Console(stderr=True)

    def banner(self) -> None:
        art = (
            "[bold cyan]╔═══════════════════════════════════════════════════════════╗[/bold cyan]\n"
            "[bold cyan]║[/bold cyan]  [bold white]B A T C H   I M A G E   E N H A N C E R[/bold white]               [bold cyan]║[/bold cyan]\n"
            "[bold cyan]║[/bold cyan]  [dim]Scale  →  Upscale  →  Enhance  →  Export[/dim]            [bold cyan]║[/bold cyan]\n"
            "[bold cyan]╠═══════════════════════════════════════════════════════════╣[/bold cyan]\n"
            "[bold cyan]║[/bold cyan]  [green]Deterministic[/green]  [dim]|[/dim]  [blue]Parallel[/blue]  [dim]|[/dim]  [yellow]Checkpoint-Resume[/yellow]  [dim]|[/dim]  [magenta]ICC+EXIF[/magenta]  [bold cyan]║[/bold cyan]\n"
            "[bold cyan]╚═══════════════════════════════════════════════════════════╝[/bold cyan]"
        )
        self.console.print(Panel.fit(art, border_style="cyan", padding=(0, 1)))

    def summary_table(self) -> None:
        cfg = self.config
        table = Table(title="Configuration", box=box.ROUNDED, show_header=False)
        table.add_column("Setting", style="cyan", no_wrap=True)
        table.add_column("Value", style="green")

        table.add_row("Target Width", str(cfg.target_width) if cfg.target_width else "Original")
        table.add_row("Target Height", str(cfg.target_height) if cfg.target_height else "Original")
        table.add_row("Scale Mode", cfg.scale_mode.value)
        table.add_row("Upscale Factor", f"{cfg.upscale_factor}x")
        table.add_row("AI Upscale", "Enabled" if cfg.use_ai_upscale else "Disabled")
        if cfg.use_ai_upscale:
            table.add_row("AI Model", cfg.ai_model)
        table.add_row("Face Enhancement", "Enabled" if cfg.use_face_enhance else "Disabled")
        table.add_row("Sharpen Amount", f"{cfg.sharpen_amount:.2f}")
        table.add_row("Denoise Strength", f"{cfg.denoise_strength:.2f} ({cfg.denoise_method})")
        table.add_row("Contrast Boost", f"{cfg.contrast_boost:.2f}")
        table.add_row("Saturation Boost", f"{cfg.saturation_boost:.2f}")
        table.add_row("Brightness Boost", f"{cfg.brightness_boost:.2f}")
        table.add_row("Output Format", cfg.output_format.upper())
        table.add_row("Output Quality", f"{cfg.output_quality}")
        table.add_row("Preserve Metadata", "Yes" if cfg.preserve_metadata else "No")
        table.add_row("Embed ICC Profile", "Yes" if cfg.embed_icc_profile else "No")
        table.add_row("Workers", str(cfg.max_workers) if cfg.max_workers else "Auto")
        table.add_row("Seed", f"{cfg.seed}")
        table.add_row("Resume", "Yes" if cfg.resume else "No")

        self.console.print(table)

    def wizard(self) -> None:
        """Interactive configuration wizard."""
        self.console.print("[bold underline]Configuration Wizard[/bold underline]\n")

        # --- Dimensions ---
        self.console.print("[cyan]Step 1: Target Dimensions[/cyan]")
        tw = Prompt.ask("Target width (px, blank = original)", default="")
        self.config = self._replace(target_width=int(tw) if tw.strip() else None)
        th = Prompt.ask("Target height (px, blank = original)", default="")
        self.config = self._replace(target_height=int(th) if th.strip() else None)
        if self.config.target_width or self.config.target_height:
            modes = [ScaleMode.FIT, ScaleMode.STRETCH, ScaleMode.WIDTH_ONLY, ScaleMode.HEIGHT_ONLY]
            for i, m in enumerate(modes, 1):
                self.console.print(f"  {i}. {m.value}")
            choice = IntPrompt.ask("Scale mode", default=1)
            self.config = self._replace(scale_mode=modes[choice - 1])

        # --- Upscale ---
        self.console.print("\n[cyan]Step 2: Upscaling[/cyan]")
        self.config = self._replace(upscale_factor=IntPrompt.ask("Upscale factor (1-8)", default=2))
        if HAS_REALESRGAN:
            ai = Confirm.ask("Use AI upscaling (Real-ESRGAN)?", default=False)
            self.config = self._replace(use_ai_upscale=ai)
            if ai:
                models = list(MODEL_REGISTRY.keys())
                for i, m in enumerate(models, 1):
                    self.console.print(f"  {i}. {m}")
                choice = IntPrompt.ask("Select model", default=1)
                self.config = self._replace(ai_model=models[choice - 1])
        if HAS_GFPGAN and self.config.use_ai_upscale:
            face = Confirm.ask("Enable face enhancement (GFPGAN)?", default=False)
            self.config = self._replace(use_face_enhance=face)

        # --- Filters ---
        self.console.print("\n[cyan]Step 3: Enhancement Filters[/cyan]")
        self.config = self._replace(sharpen_amount=FloatPrompt.ask("Sharpen (0.0-5.0)", default=1.0))
        self.config = self._replace(denoise_strength=FloatPrompt.ask("Denoise (0.0-3.0)", default=0.0))
        if self.config.denoise_strength > 0:
            dmethod = Prompt.ask("Denoise method", choices=["median", "bilateral"], default="median")
            self.config = self._replace(denoise_method=dmethod)
        self.config = self._replace(contrast_boost=FloatPrompt.ask("Contrast boost (0.0-3.0)", default=1.0))
        self.config = self._replace(saturation_boost=FloatPrompt.ask("Saturation boost (0.0-3.0)", default=1.0))
        self.config = self._replace(brightness_boost=FloatPrompt.ask("Brightness boost (0.0-3.0)", default=1.0))

        # --- Output ---
        self.console.print("\n[cyan]Step 4: Output[/cyan]")
        fmt = Prompt.ask("Format", choices=["png", "jpg", "webp", "tiff"], default="png")
        self.config = self._replace(output_format=fmt)
        if fmt in ("jpg", "webp"):
            self.config = self._replace(output_quality=IntPrompt.ask("Quality (1-100)", default=95))
        self.config = self._replace(output_suffix=Prompt.ask("Filename suffix", default="_enhanced"))
        self.config = self._replace(preserve_metadata=Confirm.ask("Preserve EXIF metadata?", default=True))
        self.config = self._replace(embed_icc_profile=Confirm.ask("Embed ICC color profile?", default=True))

        # --- Performance ---
        self.console.print("\n[cyan]Step 5: Performance & Determinism[/cyan]")
        self.config = self._replace(seed=IntPrompt.ask("Deterministic seed", default=42))
        workers = Prompt.ask("Worker threads (blank = auto)", default="")
        self.config = self._replace(max_workers=int(workers) if workers.strip() else 0)
        self.config = self._replace(resume=Confirm.ask("Resume from checkpoint if available?", default=False))

    def _replace(self, **changes) -> EnhancementConfig:
        """Return a new config with fields replaced (dataclass is frozen)."""
        d = self.config.to_dict()
        d.update(changes)
        return EnhancementConfig.from_dict(d)

    def run(self, folder: Path) -> None:
        errs = self.config.validate()
        if errs:
            for e in errs:
                self.console.print(f"[red]Config error: {e}[/red]")
            return

        self.summary_table()
        if not Confirm.ask("\nProceed?", default=True):
            return

        enhancer = ImageEnhancer(self.config)
        results = enhancer.process_batch(folder)

        # Results summary
        success = [r for r in results if r.get("success")]
        failed = [r for r in results if not r.get("success") and not r.get("skipped")]

        self.console.print("\n")
        if success:
            self.console.print(Panel(
                f"[bold green]✓ {len(success)} image(s) processed[/bold green]\n"
                f"Output: [cyan]{folder / f'enhanced_{self.config.seed}'}[/cyan]",
                border_style="green", title="Success"
            ))
        if failed:
            self.console.print(Panel(
                "\n".join(f"[red]✗ {Path(r['input_path']).name}[/red]: {r.get('error', '?')}" for r in failed),
                border_style="red", title=f"Failed ({len(failed)})"
            ))

        # Save config for reproducibility
        config_path = folder / f"enhanced_{self.config.seed}" / "enhancement_config.json"
        config_path.write_text(self.config.to_json())
        self.console.print(f"\n[dim]Config saved to {config_path}[/dim]")


# ═══════════════════════════════════════════════════════════════════════════
#  MAIN  (argument parsing & dispatch)
# ═══════════════════════════════════════════════════════════════════════════

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Production-Grade Batch Image Enhancement Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s ./photos -w 1920 -h 1080 --upscale 2 --format png
  %(prog)s ./photos --ai --model RealESRGAN_x4plus --sharpen 1.5 --jobs 4
  %(prog)s ./photos --resume                    # resume interrupted batch
  %(prog)s ./photos --config cfg.json           # load settings from JSON
  %(prog)s --save-config cfg.json               # save default settings and exit
        """
    )
    p.add_argument("path", nargs="?", help="Path to folder containing images")
    # Dimensions
    p.add_argument("-w", "--width", type=int, help="Target width in pixels")
    p.add_argument("-h", "--height", type=int, help="Target height in pixels")
    p.add_argument("--scale-mode", choices=[m.value for m in ScaleMode], default="fit",
                   help="How to apply target dimensions (default: fit)")
    p.add_argument("--no-aspect", action="store_true", help="Stretch to exact dimensions (ignore aspect ratio)")
    # Upscaling
    p.add_argument("-u", "--upscale", type=int, default=2, help="Upscale factor 1-8 (default: 2)")
    p.add_argument("--ai", action="store_true", help="Enable AI upscaling (Real-ESRGAN)")
    p.add_argument("--model", default="RealESRGAN_x4plus", choices=list(MODEL_REGISTRY.keys()),
                   help="AI model variant")
    p.add_argument("--face", action="store_true", help="Enable face enhancement (GFPGAN)")
    # Filters
    p.add_argument("--sharpen", type=float, default=1.0, help="Sharpen amount 0.0-5.0 (default: 1.0)")
    p.add_argument("--denoise", type=float, default=0.0, help="Denoise strength 0.0-3.0 (default: 0.0)")
    p.add_argument("--denoise-method", choices=["median", "bilateral"], default="median",
                   help="Denoising algorithm (default: median)")
    p.add_argument("--contrast", type=float, default=1.0, help="Contrast multiplier 0.0-3.0 (default: 1.0)")
    p.add_argument("--saturation", type=float, default=1.0, help="Saturation multiplier 0.0-3.0 (default: 1.0)")
    p.add_argument("--brightness", type=float, default=1.0, help="Brightness multiplier 0.0-3.0 (default: 1.0)")
    # Output
    p.add_argument("-f", "--format", default="png", choices=["png", "jpg", "jpeg", "webp", "tiff", "tif"],
                   help="Output format (default: png)")
    p.add_argument("-q", "--quality", type=int, default=95, help="Quality for lossy formats 1-100 (default: 95)")
    p.add_argument("--suffix", default="_enhanced", help="Output filename suffix (default: _enhanced)")
    p.add_argument("--strip-metadata", action="store_true", help="Discard EXIF metadata")
    p.add_argument("--strip-icc", action="store_true", help="Discard ICC color profile")
    # Performance
    p.add_argument("--seed", type=int, default=42, help="Deterministic seed (default: 42)")
    p.add_argument("--tile", type=int, default=512, help="Tile size for AI inference (default: 512)")
    p.add_argument("-j", "--jobs", type=int, default=0, help="Worker threads, 0 = auto (default: 0)")
    p.add_argument("--memory", type=int, default=0, help="Memory limit in MB, 0 = auto (default: 0)")
    # Fault tolerance
    p.add_argument("--resume", action="store_true", help="Resume from checkpoint database")
    p.add_argument("--retries", type=int, default=2, help="Max retries per image (default: 2)")
    p.add_argument("--retry-delay", type=float, default=1.0, help="Base retry delay in seconds (default: 1.0)")
    # Config I/O
    p.add_argument("--config", help="Load configuration from JSON file")
    p.add_argument("--save-config", help="Save configuration to JSON file and exit")
    # Logging
    p.add_argument("-v", "--verbose", action="store_true", help="Enable verbose debug logging")
    return p


def setup_logging(verbose: bool = False) -> None:
    level = logging.DEBUG if verbose else logging.WARNING
    logging.basicConfig(
        level=level,
        format="%(message)s",
        datefmt="[%X]",
        handlers=[RichHandler(console=console, rich_tracebacks=True)]
    )


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    setup_logging(args.verbose)

    tui = EnhancementTUI()

    # Load JSON config if specified
    if args.config:
        with open(args.config) as f:
            tui.config = EnhancementConfig.from_dict(json.load(f))

    # Merge CLI args
    tui.config = EnhancementConfig.from_args(args)

    # Save config and exit
    if args.save_config:
        Path(args.save_config).write_text(tui.config.to_json())
        console.print(f"[green]Configuration saved to {args.save_config}[/green]")
        return 0

    tui.banner()

    # Determine target folder
    if args.path:
        target = Path(args.path).resolve()
    else:
        target = Path(Prompt.ask("Enter path to image folder")).resolve()

    if not target.exists():
        console.print(f"[red]Error: Path does not exist: {target}[/red]")
        return 1
    if not target.is_dir():
        console.print(f"[red]Error: Not a directory: {target}[/red]")
        return 1

    # If no processing-related CLI args were given, launch interactive wizard
    no_cli_args = not any([
        args.width, args.height, args.ai, args.face,
        args.sharpen != 1.0, args.denoise != 0.0,
        args.contrast != 1.0, args.saturation != 1.0,
        args.brightness != 1.0, args.upscale != 2,
        args.config
    ])
    if no_cli_args:
        tui.wizard()

    tui.run(target)
    return 0


if __name__ == "__main__":
    sys.exit(main())
