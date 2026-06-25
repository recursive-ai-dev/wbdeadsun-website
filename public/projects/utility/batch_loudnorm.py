#!/usr/bin/env python3
"""
batch_loudnorm.py — Comprehensive Batch EBU R128 / ITU-R BS.1770-4 Loudness Normalizer
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Supports    : .wav  .flac  .mp3
Algorithm   : Two-pass linear loudnorm via FFmpeg's EBU R128 implementation
Auto-tests  : Pre-analysis → Normalize → Post-verification on every file
Outputs     : Full per-file report + JSON log + terminal summary

Requires    : Python 3.8+  |  FFmpeg ≥ 4.2 with libmp3lame

Usage       : python3 batch_loudnorm.py /path/to/folder [options]

Common targets
  Streaming (Spotify/YouTube) : -I -14  -TP -1.0  -LRA 11  (default)
  Apple Music / Tidal         : -I -16  -TP -1.0  -LRA 11
  Broadcast EBU R128          : -I -23  -TP -1.0  -LRA 15
  CD mastering                : -I -14  -TP -0.1  -LRA 8
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import shutil
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# ──────────────────────────────────────────────────────────────────────────────
# ANSI colour helpers (auto-disabled when not a TTY)
# ──────────────────────────────────────────────────────────────────────────────
_USE_COLOR = sys.stdout.isatty()


def _c(*codes: str) -> str:
    return "".join(codes) if _USE_COLOR else ""


class C:
    RESET  = _c("\033[0m")
    BOLD   = _c("\033[1m")
    DIM    = _c("\033[2m")
    RED    = _c("\033[91m")
    GREEN  = _c("\033[92m")
    YELLOW = _c("\033[93m")
    BLUE   = _c("\033[94m")
    CYAN   = _c("\033[96m")
    GREY   = _c("\033[90m")
    WHITE  = _c("\033[97m")
    MAGENTA = _c("\033[95m")


def col(text: str, *codes: str) -> str:
    return "".join(codes) + str(text) + C.RESET


# ──────────────────────────────────────────────────────────────────────────────
# Constants & defaults
# ──────────────────────────────────────────────────────────────────────────────
SUPPORTED_EXT        = {".wav", ".flac", ".mp3"}
DEFAULT_TARGET_I     = -14.0   # Integrated loudness  (LUFS)
DEFAULT_TARGET_TP    =  -1.0   # True Peak             (dBTP)
DEFAULT_TARGET_LRA   =  11.0   # Loudness Range        (LU)
DEFAULT_TOLERANCE    =   0.5   # LUFS — skip if already this close to target
MIN_DURATION_S       =   0.5   # Skip files shorter than this (loudnorm unreliable)
SILENCE_THRESHOLD_I  = -70.0   # Skip files quieter than this (considered silent)
DEFAULT_WORKERS      =   2     # Parallel workers (ffmpeg itself is multi-threaded)
FFMPEG_THREAD_COUNT  =   2     # ffmpeg -threads per worker
LOG_DATE_FMT         = "%Y-%m-%d %H:%M:%S"
REPORT_DATE_FMT      = "%Y%m%d_%H%M%S"


# ──────────────────────────────────────────────────────────────────────────────
# Data classes
# ──────────────────────────────────────────────────────────────────────────────
@dataclass
class LoudnormStats:
    """Raw JSON payload from FFmpeg's loudnorm filter."""
    input_i:            float = 0.0
    input_tp:           float = 0.0
    input_lra:          float = 0.0
    input_thresh:       float = 0.0
    output_i:           float = 0.0
    output_tp:          float = 0.0
    output_lra:         float = 0.0
    output_thresh:      float = 0.0
    target_offset:      float = 0.0
    normalization_type: str   = ""

    @classmethod
    def from_dict(cls, d: dict) -> "LoudnormStats":
        def f(k: str) -> float:
            v = d.get(k, "0")
            try:
                return float(v)
            except (ValueError, TypeError):
                return 0.0

        return cls(
            input_i            = f("input_i"),
            input_tp           = f("input_tp"),
            input_lra          = f("input_lra"),
            input_thresh       = f("input_thresh"),
            output_i           = f("output_i"),
            output_tp          = f("output_tp"),
            output_lra         = f("output_lra"),
            output_thresh      = f("output_thresh"),
            target_offset      = f("target_offset"),
            normalization_type = str(d.get("normalization_type", "")),
        )


@dataclass
class ProbeInfo:
    """Audio stream properties extracted via ffprobe."""
    codec_name:  str   = "pcm_s16le"
    sample_rate: int   = 44100
    bit_depth:   int   = 16
    channels:    int   = 2
    bitrate_kbps: int  = 320
    duration_s:  float = 0.0
    format_name: str   = ""


@dataclass
class VerifyResult:
    """Measured loudness of the output file after normalization."""
    lufs: float = 0.0
    tp:   float = 0.0
    lra:  float = 0.0
    ok:   bool  = False
    delta_lufs: float = 0.0


@dataclass
class FileResult:
    """Complete per-file processing record."""
    path:          Path
    output_path:   Optional[Path]   = None
    status:        str              = "pending"   # pending|skipped|normalized|error|dry_run
    error:         str              = ""
    skipped_reason: str             = ""
    probe:         Optional[ProbeInfo]     = None
    analysis:      Optional[LoudnormStats] = None
    verify:        Optional[VerifyResult]  = None
    elapsed_s:     float            = 0.0

    # Convenience accessors
    @property
    def pre_lufs(self) -> float:
        return self.analysis.input_i if self.analysis else 0.0

    @property
    def pre_tp(self) -> float:
        return self.analysis.input_tp if self.analysis else 0.0

    @property
    def pre_lra(self) -> float:
        return self.analysis.input_lra if self.analysis else 0.0

    @property
    def post_lufs(self) -> float:
        return self.verify.lufs if self.verify else 0.0

    @property
    def post_tp(self) -> float:
        return self.verify.tp if self.verify else 0.0

    @property
    def verified_ok(self) -> bool:
        return self.verify.ok if self.verify else False

    def to_dict(self) -> dict:
        return {
            "file":        str(self.path),
            "output":      str(self.output_path) if self.output_path else None,
            "status":      self.status,
            "error":       self.error,
            "skip_reason": self.skipped_reason,
            "elapsed_s":   round(self.elapsed_s, 2),
            "pre": {
                "lufs": self.pre_lufs,
                "tp":   self.pre_tp,
                "lra":  self.pre_lra,
            } if self.analysis else None,
            "post": {
                "lufs":       self.post_lufs,
                "tp":         self.post_tp,
                "delta_lufs": self.verify.delta_lufs if self.verify else None,
                "verified":   self.verified_ok,
            } if self.verify else None,
        }


# ──────────────────────────────────────────────────────────────────────────────
# FFmpeg / ffprobe helpers
# ──────────────────────────────────────────────────────────────────────────────
def _run(cmd: List[str], timeout: int = 300) -> Tuple[str, str, int]:
    """Run a subprocess, return (stdout, stderr, returncode)."""
    try:
        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=timeout,
        )
        return (
            proc.stdout.decode("utf-8", errors="replace"),
            proc.stderr.decode("utf-8", errors="replace"),
            proc.returncode,
        )
    except subprocess.TimeoutExpired:
        return ("", "Process timed out", -1)
    except FileNotFoundError as exc:
        return ("", f"Executable not found: {exc}", -1)


def require_ffmpeg() -> None:
    """Abort early if ffmpeg / ffprobe are not on PATH."""
    for binary in ("ffmpeg", "ffprobe"):
        _, _, code = _run([binary, "-version"])
        if code != 0:
            sys.exit(
                col(f"\nERROR: '{binary}' not found on PATH. "
                    f"Install FFmpeg (https://ffmpeg.org/download.html) and retry.\n",
                    C.RED, C.BOLD)
            )


def probe_file(path: Path) -> ProbeInfo:
    """Extract audio properties from a file using ffprobe."""
    stdout, stderr, code = _run([
        "ffprobe", "-v", "quiet",
        "-print_format", "json",
        "-show_streams", "-show_format",
        str(path),
    ])
    if code != 0:
        raise RuntimeError(f"ffprobe failed: {stderr.strip()[:200]}")

    data      = json.loads(stdout)
    streams   = data.get("streams", [])
    fmt       = data.get("format", {})

    # Pick the first audio stream
    audio = next((s for s in streams if s.get("codec_type") == "audio"), None)
    if audio is None:
        raise RuntimeError("No audio stream found")

    def _int(val, default: int = 0) -> int:
        try:
            return int(val)
        except (TypeError, ValueError):
            return default

    def _float(val, default: float = 0.0) -> float:
        try:
            return float(val)
        except (TypeError, ValueError):
            return default

    # bits_per_sample is reliable for wav/flac; mp3 returns 0
    bit_depth = _int(audio.get("bits_per_sample", 0)) or 16

    # Bitrate: prefer stream bitrate, fall back to format bitrate (bps → kbps)
    raw_br = _int(audio.get("bit_rate") or fmt.get("bit_rate", 0))
    bitrate_kbps = max(raw_br // 1000, 1) if raw_br > 0 else 320

    return ProbeInfo(
        codec_name   = audio.get("codec_name", "unknown"),
        sample_rate  = _int(audio.get("sample_rate", 44100)),
        bit_depth    = bit_depth,
        channels     = _int(audio.get("channels", 2)),
        bitrate_kbps = bitrate_kbps,
        duration_s   = _float(audio.get("duration") or fmt.get("duration", 0)),
        format_name  = fmt.get("format_name", ""),
    )


def _extract_loudnorm_json(stderr_text: str) -> dict:
    """
    Parse the loudnorm JSON block printed to stderr by FFmpeg.

    FFmpeg emits a block like:
        [Parsed_loudnorm_0 @ 0x...] {
            "input_i" : "-20.35",
            ...
        }
    """
    # Find the JSON block — it's a flat object (no nested braces)
    match = re.search(r'\{[^{}]*"input_i"[^{}]*\}', stderr_text, re.DOTALL)
    if not match:
        raise RuntimeError(
            "loudnorm JSON not found in ffmpeg output. "
            "File may be too short or silent.\n"
            f"stderr tail: {stderr_text[-400:]}"
        )
    raw = match.group(0)
    # FFmpeg uses tabs; json.loads is fine with that
    return json.loads(raw)


def analyze_loudness(path: Path, target_i: float, target_tp: float,
                     target_lra: float) -> LoudnormStats:
    """
    Pass 1: measure the file's loudness characteristics.
    Returns LoudnormStats with both input measurements and predicted output values.
    """
    filter_str = (
        f"loudnorm=I={target_i}:TP={target_tp}:LRA={target_lra}"
        ":print_format=json"
    )
    _, stderr, code = _run([
        "ffmpeg", "-nostdin", "-y",
        "-threads", str(FFMPEG_THREAD_COUNT),
        "-i", str(path),
        "-af", filter_str,
        "-f", "null", "-",
    ])
    if code != 0 and "Output file #0 does not contain" not in stderr:
        # ffmpeg exits 0 even for null output; a real failure includes errors
        # Check if the JSON is present despite non-zero exit (some edge cases)
        if '"input_i"' not in stderr:
            raise RuntimeError(f"ffmpeg analysis failed (exit {code}): {stderr[-300:]}")

    raw = _extract_loudnorm_json(stderr)
    return LoudnormStats.from_dict(raw)


def _build_output_codec_args(ext: str, probe: ProbeInfo) -> List[str]:
    """
    Return the FFmpeg codec/quality arguments appropriate for the output format.
    Lossless formats preserve bit depth; MP3 preserves original bitrate (min 128k).
    """
    if ext == ".wav":
        # Map bit depth to PCM codec
        pcm_map = {8: "pcm_u8", 16: "pcm_s16le", 24: "pcm_s24le", 32: "pcm_s32le"}
        codec = pcm_map.get(probe.bit_depth, "pcm_s16le")
        return ["-c:a", codec]

    if ext == ".flac":
        return [
            "-c:a", "flac",
            "-compression_level", "8",
            "-bits_per_raw_sample", str(max(probe.bit_depth, 16)),
        ]

    if ext == ".mp3":
        # Prefer VBR V0 (~245 kbps) when original is high-bitrate; else match original
        if probe.bitrate_kbps >= 256:
            return ["-c:a", "libmp3lame", "-q:a", "0"]
        elif probe.bitrate_kbps >= 128:
            return ["-c:a", "libmp3lame", "-b:a", f"{probe.bitrate_kbps}k"]
        else:
            return ["-c:a", "libmp3lame", "-b:a", "128k"]

    # Fallback: let ffmpeg decide
    return []


def normalize_file(
    path: Path,
    output_path: Path,
    analysis: LoudnormStats,
    probe: ProbeInfo,
    target_i: float,
    target_tp: float,
    target_lra: float,
) -> None:
    """
    Pass 2: apply linear loudness normalization using measured values from Pass 1.
    Uses linear=true for sample-accurate, distortion-free gain adjustment.
    Falls back to dynamic mode when linear normalization is not feasible
    (e.g. input is already louder than target; clipping would occur).
    """
    ext = path.suffix.lower()

    # Linear normalization is appropriate when measured_tp ≤ target_tp.
    # If measured_tp > target_tp, the filter will be forced into dynamic mode
    # automatically by FFmpeg — we don't need to handle this ourselves.
    filter_str = (
        f"loudnorm=I={target_i}:TP={target_tp}:LRA={target_lra}"
        f":measured_I={analysis.input_i}"
        f":measured_TP={analysis.input_tp}"
        f":measured_LRA={analysis.input_lra}"
        f":measured_thresh={analysis.input_thresh}"
        f":offset={analysis.target_offset}"
        ":linear=true"
        ":print_format=json"
    )

    codec_args = _build_output_codec_args(ext, probe)

    cmd = [
        "ffmpeg", "-nostdin", "-y",
        "-threads", str(FFMPEG_THREAD_COUNT),
        "-i", str(path),
        "-af", filter_str,
        *codec_args,
        "-ar", str(probe.sample_rate),  # preserve sample rate
        "-map_metadata", "0",           # copy all metadata/tags
        str(output_path),
    ]

    _, stderr, code = _run(cmd)
    if code != 0:
        raise RuntimeError(f"ffmpeg normalization failed (exit {code}): {stderr[-400:]}")

    if not output_path.exists() or output_path.stat().st_size == 0:
        raise RuntimeError(f"Output file missing or empty: {output_path}")


def verify_output(
    output_path: Path,
    target_i: float,
    target_tp: float,
    target_lra: float,
    tolerance: float,
) -> VerifyResult:
    """
    Re-analyze the normalized output file and confirm it landed within tolerance.
    This is the auto-test step — we don't trust ffmpeg's predicted values alone.
    """
    stats = analyze_loudness(output_path, target_i, target_tp, target_lra)
    delta = abs(stats.input_i - target_i)
    return VerifyResult(
        lufs       = stats.input_i,
        tp         = stats.input_tp,
        lra        = stats.input_lra,
        delta_lufs = stats.input_i - target_i,
        ok         = delta <= tolerance,
    )


# ──────────────────────────────────────────────────────────────────────────────
# Output path resolution
# ──────────────────────────────────────────────────────────────────────────────
def resolve_output_path(
    src: Path,
    input_root: Path,
    output_dir: Optional[Path],
    in_place: bool,
) -> Path:
    """
    Determine where the normalized file should be written.

    Modes:
      --in-place                : same path (caller must back up original first)
      --output-dir DIR          : mirror directory structure under DIR
      default (no flags)        : <input_root>/normalized/<relative_path>
    """
    if in_place:
        return src

    rel = src.relative_to(input_root)

    if output_dir is not None:
        dest = output_dir / rel
    else:
        dest = input_root / "normalized" / rel

    dest.parent.mkdir(parents=True, exist_ok=True)
    return dest


# ──────────────────────────────────────────────────────────────────────────────
# Core per-file processor
# ──────────────────────────────────────────────────────────────────────────────
def process_file(
    path: Path,
    input_root: Path,
    output_dir: Optional[Path],
    in_place: bool,
    backup: bool,
    skip_normalized: bool,
    dry_run: bool,
    target_i: float,
    target_tp: float,
    target_lra: float,
    tolerance: float,
    logger: logging.Logger,
) -> FileResult:
    result  = FileResult(path=path)
    t_start = time.monotonic()

    try:
        # ── 1. Probe ──────────────────────────────────────────────────────────
        logger.debug("Probing: %s", path.name)
        probe = probe_file(path)
        result.probe = probe

        # ── 2. Guard: too short ───────────────────────────────────────────────
        if probe.duration_s < MIN_DURATION_S:
            result.status        = "skipped"
            result.skipped_reason = f"duration {probe.duration_s:.2f}s < {MIN_DURATION_S}s minimum"
            return result

        # ── 3. Pass 1: loudness analysis ──────────────────────────────────────
        logger.debug("Analyzing: %s", path.name)
        analysis = analyze_loudness(path, target_i, target_tp, target_lra)
        result.analysis = analysis

        # ── 4. Guard: silence ─────────────────────────────────────────────────
        if analysis.input_i <= SILENCE_THRESHOLD_I:
            result.status        = "skipped"
            result.skipped_reason = f"input LUFS {analysis.input_i:.1f} ≤ silence threshold {SILENCE_THRESHOLD_I}"
            return result

        # ── 5. Guard: already normalized ─────────────────────────────────────
        if skip_normalized and abs(analysis.input_i - target_i) <= tolerance:
            result.status        = "skipped"
            result.skipped_reason = (
                f"already within tolerance: {analysis.input_i:.1f} LUFS "
                f"(target {target_i}, tol ±{tolerance})"
            )
            return result

        # ── 6. Resolve output path ────────────────────────────────────────────
        out = resolve_output_path(path, input_root, output_dir, in_place)
        result.output_path = out

        if dry_run:
            result.status = "dry_run"
            return result

        # ── 7. Backup original (in-place mode) ───────────────────────────────
        if in_place and backup:
            bak = path.with_suffix(path.suffix + ".bak")
            if not bak.exists():
                shutil.copy2(path, bak)
                logger.debug("Backed up: %s → %s", path.name, bak.name)

        # ── 8. Pass 2: normalize ──────────────────────────────────────────────
        # In-place mode: FFmpeg cannot read and write the same file, so we
        # normalize to a sibling temp file and then atomically replace the original.
        if in_place and out == path:
            tmp_out = path.with_suffix(f".loudnorm_tmp{path.suffix}")
            try:
                logger.debug("Normalizing (in-place tmp): %s → %s", path.name, tmp_out.name)
                normalize_file(path, tmp_out, analysis, probe, target_i, target_tp, target_lra)
                # Preserve original timestamps and then replace
                shutil.copystat(path, tmp_out)
                tmp_out.replace(path)    # atomic on POSIX; overwrites on Windows
                logger.debug("Replaced original: %s", path.name)
            except Exception:
                # Clean up orphaned temp file before re-raising
                if tmp_out.exists():
                    tmp_out.unlink(missing_ok=True)
                raise
        else:
            logger.debug("Normalizing: %s → %s", path.name, out.name)
            normalize_file(path, out, analysis, probe, target_i, target_tp, target_lra)

        # ── 9. Auto-test: verify output ───────────────────────────────────────
        logger.debug("Verifying: %s", out.name)
        verify = verify_output(out, target_i, target_tp, target_lra, tolerance)
        result.verify = verify

        result.status = "normalized"

    except Exception as exc:
        result.status = "error"
        result.error  = str(exc)
        logger.error("ERROR %s: %s", path.name, exc)

    finally:
        result.elapsed_s = time.monotonic() - t_start

    return result


# ──────────────────────────────────────────────────────────────────────────────
# File discovery
# ──────────────────────────────────────────────────────────────────────────────
def discover_files(input_root: Path, recursive: bool) -> List[Path]:
    """Collect all supported audio files under input_root."""
    if recursive:
        candidates = input_root.rglob("*")
    else:
        candidates = input_root.glob("*")

    files = sorted(
        p for p in candidates
        if p.is_file() and p.suffix.lower() in SUPPORTED_EXT
        # Exclude backup files created by this tool
        and not p.name.endswith(".bak")
    )
    return files


# ──────────────────────────────────────────────────────────────────────────────
# Terminal output helpers
# ──────────────────────────────────────────────────────────────────────────────
def _lufs_str(val: float, target: float, tolerance: float) -> str:
    delta = val - target
    s     = f"{val:+.1f} LUFS"
    if abs(delta) <= tolerance:
        return col(s, C.GREEN)
    elif abs(delta) <= tolerance * 3:
        return col(s, C.YELLOW)
    else:
        return col(s, C.RED)


def print_header(target_i: float, target_tp: float, target_lra: float,
                 tolerance: float, n_files: int, dry_run: bool) -> None:
    bar  = "━" * 72
    mode = col(" DRY RUN ", C.YELLOW, C.BOLD) if dry_run else ""
    print(f"\n{col(bar, C.CYAN)}")
    print(col("  batch_loudnorm", C.BOLD, C.WHITE) + col(" — EBU R128 Two-Pass Loudness Normalizer", C.GREY) + mode)
    print(f"{col(bar, C.CYAN)}")
    print(f"  Target  : {col(f'{target_i:+.1f} LUFS', C.BOLD)}  |  "
          f"True Peak: {col(f'{target_tp:+.1f} dBTP', C.BOLD)}  |  "
          f"LRA: {col(f'{target_lra:.0f} LU', C.BOLD)}")
    print(f"  Tolerance: ±{tolerance} LUFS  |  Files found: {col(str(n_files), C.CYAN, C.BOLD)}")
    print(f"{col(bar, C.CYAN)}\n")


def print_file_result(result: FileResult, idx: int, total: int,
                      target_i: float, tolerance: float) -> None:
    n      = f"[{idx:>{len(str(total))}}/{total}]"
    name   = result.path.name
    status = result.status

    if status == "normalized":
        icon  = col("✔", C.GREEN, C.BOLD)
        vmark = col("✔ verified", C.GREEN) if result.verified_ok else col("✘ verify FAIL", C.RED, C.BOLD)
        pre   = f"{result.pre_lufs:+.1f}"
        post  = f"{result.post_lufs:+.1f}"
        delta = result.verify.delta_lufs if result.verify else 0.0
        d_str = col(f"{delta:+.2f}", C.GREEN if abs(delta) <= tolerance else C.YELLOW)
        print(f"  {col(n, C.GREY)} {icon} {col(name, C.WHITE)}  "
              f"{col(pre, C.GREY)} → {col(post, C.CYAN)} LUFS  Δ{d_str}  {vmark}  "
              f"{col(f'{result.elapsed_s:.1f}s', C.GREY)}")

    elif status == "skipped":
        icon = col("→", C.YELLOW)
        print(f"  {col(n, C.GREY)} {icon} {col(name, C.GREY)}  "
              f"{col('skipped', C.YELLOW)}: {result.skipped_reason}")

    elif status == "dry_run":
        lufs = f"{result.pre_lufs:+.1f}"
        icon = col("~", C.BLUE)
        print(f"  {col(n, C.GREY)} {icon} {col(name, C.WHITE)}  "
              f"{col(lufs, C.GREY)} LUFS  {col('[dry run]', C.BLUE)}")

    elif status == "error":
        icon = col("✘", C.RED, C.BOLD)
        print(f"  {col(n, C.GREY)} {icon} {col(name, C.RED)}  "
              f"{col('ERROR', C.RED, C.BOLD)}: {result.error[:120]}")

    else:
        print(f"  {col(n, C.GREY)} ? {name}  status={status}")


def print_summary(results: List[FileResult], target_i: float,
                  tolerance: float, elapsed_total: float) -> None:
    normalized  = [r for r in results if r.status == "normalized"]
    skipped     = [r for r in results if r.status == "skipped"]
    errors      = [r for r in results if r.status == "error"]
    dry_runs    = [r for r in results if r.status == "dry_run"]
    verified    = [r for r in normalized if r.verified_ok]
    verify_fail = [r for r in normalized if not r.verified_ok]

    bar = "━" * 72
    print(f"\n{col(bar, C.CYAN)}")
    print(col("  SUMMARY", C.BOLD, C.WHITE))
    print(f"{col(bar, C.CYAN)}")

    def _stat(label: str, count: int, color: str) -> None:
        print(f"  {label:<22}: {col(str(count), color, C.BOLD)}")

    _stat("Normalized",      len(normalized),  C.GREEN)
    _stat("  └─ Verified OK",  len(verified),    C.GREEN)
    _stat("  └─ Verify FAIL",  len(verify_fail), C.RED if verify_fail else C.GREY)
    _stat("Skipped",          len(skipped),     C.YELLOW)
    _stat("Errors",           len(errors),      C.RED if errors else C.GREY)
    if dry_runs:
        _stat("Dry-run analyzed", len(dry_runs), C.BLUE)

    if normalized:
        lufs_vals = [r.post_lufs for r in normalized if r.verify]
        if lufs_vals:
            avg   = sum(lufs_vals) / len(lufs_vals)
            worst = max(abs(v - target_i) for v in lufs_vals)
            print(f"\n  Output avg LUFS  : {avg:+.2f}")
            print(f"  Worst Δ from target: {worst:+.2f} LUFS")

    print(f"\n  Total time       : {elapsed_total:.1f}s")
    print(f"{col(bar, C.CYAN)}\n")

    if verify_fail:
        print(col("  ⚠  VERIFICATION FAILURES — these files may need re-processing:", C.RED, C.BOLD))
        for r in verify_fail:
            delta = r.verify.delta_lufs if r.verify else float("nan")
            print(f"    {r.path.name}  post={r.post_lufs:+.1f} LUFS  Δ={delta:+.2f}")
        print()

    if errors:
        print(col("  ✘  ERRORS:", C.RED, C.BOLD))
        for r in errors:
            print(f"    {r.path.name}: {r.error[:120]}")
        print()


# ──────────────────────────────────────────────────────────────────────────────
# Report generation
# ──────────────────────────────────────────────────────────────────────────────
def write_json_report(
    results: List[FileResult],
    report_path: Path,
    args_dict: dict,
) -> None:
    """Write a full machine-readable JSON report."""
    payload = {
        "generated_at": datetime.now().strftime(LOG_DATE_FMT),
        "settings":     args_dict,
        "totals": {
            "total":      len(results),
            "normalized": sum(1 for r in results if r.status == "normalized"),
            "skipped":    sum(1 for r in results if r.status == "skipped"),
            "errors":     sum(1 for r in results if r.status == "error"),
            "dry_run":    sum(1 for r in results if r.status == "dry_run"),
            "verified_ok": sum(1 for r in results if r.status == "normalized" and r.verified_ok),
        },
        "files": [r.to_dict() for r in results],
    }
    report_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def write_text_report(
    results: List[FileResult],
    report_path: Path,
    target_i: float,
    target_tp: float,
    target_lra: float,
    tolerance: float,
) -> None:
    """Write a human-readable tabular text report."""
    lines: List[str] = []
    now   = datetime.now().strftime(LOG_DATE_FMT)
    lines.append("batch_loudnorm — Processing Report")
    lines.append(f"Generated : {now}")
    lines.append(f"Target    : {target_i:+.1f} LUFS  |  TP {target_tp:+.1f} dBTP  |  LRA {target_lra:.0f} LU")
    lines.append(f"Tolerance : ±{tolerance} LUFS")
    lines.append("=" * 100)

    # Table header
    COL = (40, 8, 8, 8, 8, 6, 9, 12)
    hdr = (
        f"{'File':<{COL[0]}} {'Pre LUFS':>{COL[1]}} {'Pre TP':>{COL[2]}} "
        f"{'Post LUFS':>{COL[3]}} {'Post TP':>{COL[4]}} {'Δ LUFS':>{COL[5]}} "
        f"{'Verified':>{COL[6]}} {'Status':<{COL[7]}}"
    )
    lines.append(hdr)
    lines.append("-" * 100)

    for r in results:
        name   = r.path.name[:COL[0]]
        pre_l  = f"{r.pre_lufs:+.1f}" if r.analysis else "—"
        pre_tp = f"{r.pre_tp:+.1f}"   if r.analysis else "—"
        if r.status == "normalized" and r.verify:
            post_l  = f"{r.post_lufs:+.1f}"
            post_tp = f"{r.post_tp:+.1f}"
            delta   = f"{r.verify.delta_lufs:+.2f}"
            verif   = "YES" if r.verified_ok else "FAIL"
        else:
            post_l = post_tp = delta = verif = "—"

        status_label = r.status.upper()
        if r.status == "skipped":
            status_label += f" ({r.skipped_reason[:20]})"
        elif r.status == "error":
            status_label = f"ERROR"

        lines.append(
            f"{name:<{COL[0]}} {pre_l:>{COL[1]}} {pre_tp:>{COL[2]}} "
            f"{post_l:>{COL[3]}} {post_tp:>{COL[4]}} {delta:>{COL[5]}} "
            f"{verif:>{COL[6]}} {status_label:<{COL[7]}}"
        )

    lines.append("=" * 100)

    # Errors block
    errors = [r for r in results if r.status == "error"]
    if errors:
        lines.append("\nERRORS:")
        for r in errors:
            lines.append(f"  {r.path.name}: {r.error}")

    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


# ──────────────────────────────────────────────────────────────────────────────
# Batch orchestrator
# ──────────────────────────────────────────────────────────────────────────────
def run_batch(
    input_dir: Path,
    output_dir: Optional[Path],
    in_place: bool,
    backup: bool,
    skip_normalized: bool,
    dry_run: bool,
    recursive: bool,
    target_i: float,
    target_tp: float,
    target_lra: float,
    tolerance: float,
    workers: int,
    json_report: Optional[Path],
    text_report: Optional[Path],
    log_path: Optional[Path],
    verbose: bool,
    args_dict: dict,
) -> int:
    """Main batch processing loop. Returns exit code (0 = success)."""

    # ── Logging setup ─────────────────────────────────────────────────────────
    log_level  = logging.DEBUG if verbose else logging.WARNING
    handlers: List[logging.Handler] = [logging.StreamHandler(sys.stderr)]
    if log_path:
        log_path.parent.mkdir(parents=True, exist_ok=True)
        handlers.append(logging.FileHandler(log_path, encoding="utf-8"))
    logging.basicConfig(
        level   = log_level,
        format  = "%(asctime)s  %(levelname)-8s  %(message)s",
        datefmt = LOG_DATE_FMT,
        handlers= handlers,
    )
    logger = logging.getLogger("batch_loudnorm")

    # ── Discover files ────────────────────────────────────────────────────────
    files = discover_files(input_dir, recursive)
    if not files:
        print(col(f"\nNo supported audio files found in: {input_dir}\n", C.YELLOW))
        return 0

    print_header(target_i, target_tp, target_lra, tolerance, len(files), dry_run)

    if dry_run:
        print(col("  DRY RUN — no files will be written.\n", C.YELLOW))

    # ── Output dir guard ──────────────────────────────────────────────────────
    if output_dir:
        output_dir.mkdir(parents=True, exist_ok=True)

    # ── Process ───────────────────────────────────────────────────────────────
    results: List[FileResult] = []
    t_batch_start = time.monotonic()

    if workers > 1 and len(files) > 1:
        # Parallel path — each file gets its own thread
        futures = {}
        with ThreadPoolExecutor(max_workers=workers) as executor:
            for path in files:
                fut = executor.submit(
                    process_file,
                    path, input_dir, output_dir, in_place, backup,
                    skip_normalized, dry_run,
                    target_i, target_tp, target_lra, tolerance, logger,
                )
                futures[fut] = path

            completed = 0
            for fut in as_completed(futures):
                completed += 1
                result = fut.result()
                results.append(result)
                print_file_result(result, completed, len(files), target_i, tolerance)
    else:
        # Sequential path — simpler, predictable order
        for idx, path in enumerate(files, 1):
            result = process_file(
                path, input_dir, output_dir, in_place, backup,
                skip_normalized, dry_run,
                target_i, target_tp, target_lra, tolerance, logger,
            )
            results.append(result)
            print_file_result(result, idx, len(files), target_i, tolerance)

    # Sort results back to discovery order for reports
    order = {p: i for i, p in enumerate(files)}
    results.sort(key=lambda r: order.get(r.path, 0))

    elapsed_total = time.monotonic() - t_batch_start
    print_summary(results, target_i, tolerance, elapsed_total)

    # ── Reports ───────────────────────────────────────────────────────────────
    ts = datetime.now().strftime(REPORT_DATE_FMT)

    if json_report is None:
        json_report = input_dir / f"loudnorm_report_{ts}.json"
    if text_report is None:
        text_report = input_dir / f"loudnorm_report_{ts}.txt"

    write_json_report(results, json_report, args_dict)
    write_text_report(results, text_report, target_i, target_tp, target_lra, tolerance)

    print(f"  Reports written:")
    print(f"    JSON : {json_report}")
    print(f"    Text : {text_report}")
    if log_path:
        print(f"    Log  : {log_path}")
    print()

    # ── Exit code ─────────────────────────────────────────────────────────────
    n_errors     = sum(1 for r in results if r.status == "error")
    n_verify_bad = sum(1 for r in results if r.status == "normalized" and not r.verified_ok)

    if n_errors > 0 or n_verify_bad > 0:
        return 1   # partial failure
    return 0


# ──────────────────────────────────────────────────────────────────────────────
# CLI argument parsing
# ──────────────────────────────────────────────────────────────────────────────
def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog        = "batch_loudnorm",
        description = __doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    p.add_argument(
        "input_dir",
        type = Path,
        help = "Folder containing audio files to normalize",
    )

    # Output mode (mutually exclusive)
    output_group = p.add_mutually_exclusive_group()
    output_group.add_argument(
        "--output-dir", "-o",
        metavar = "DIR",
        type    = Path,
        default = None,
        help    = "Write normalized files to this directory (mirrors folder structure). "
                  "Default: creates '<input_dir>/normalized/'",
    )
    output_group.add_argument(
        "--in-place", "-i",
        action  = "store_true",
        default = False,
        help    = "Overwrite original files in-place (use with --backup to be safe)",
    )

    p.add_argument(
        "--backup", "-b",
        action  = "store_true",
        default = False,
        help    = "When using --in-place, copy original to <file>.bak before overwriting",
    )

    # Targets
    tgt = p.add_argument_group("loudness targets")
    tgt.add_argument(
        "--target-lufs", "-I",
        metavar = "LUFS",
        type    = float,
        default = DEFAULT_TARGET_I,
        help    = f"Integrated loudness target in LUFS (default: {DEFAULT_TARGET_I})",
    )
    tgt.add_argument(
        "--target-tp", "-TP",
        metavar = "dBTP",
        type    = float,
        default = DEFAULT_TARGET_TP,
        help    = f"True Peak ceiling in dBTP (default: {DEFAULT_TARGET_TP})",
    )
    tgt.add_argument(
        "--target-lra", "-LRA",
        metavar = "LU",
        type    = float,
        default = DEFAULT_TARGET_LRA,
        help    = f"Loudness Range target in LU (default: {DEFAULT_TARGET_LRA})",
    )
    tgt.add_argument(
        "--tolerance", "-t",
        metavar = "LUFS",
        type    = float,
        default = DEFAULT_TOLERANCE,
        help    = f"LUFS tolerance for verification pass-fail and --skip-normalized "
                  f"(default: ±{DEFAULT_TOLERANCE})",
    )

    # Behavior
    beh = p.add_argument_group("behavior")
    beh.add_argument(
        "--skip-normalized", "-s",
        action  = "store_true",
        default = False,
        help    = "Skip files already within --tolerance of target LUFS",
    )
    beh.add_argument(
        "--recursive", "-r",
        action  = "store_true",
        default = False,
        help    = "Scan subdirectories recursively",
    )
    beh.add_argument(
        "--dry-run", "-n",
        action  = "store_true",
        default = False,
        help    = "Analyze only — do not write any output files",
    )
    beh.add_argument(
        "--workers", "-w",
        metavar = "N",
        type    = int,
        default = DEFAULT_WORKERS,
        help    = f"Parallel worker threads (default: {DEFAULT_WORKERS}). "
                  f"Set to 1 for sequential processing.",
    )

    # Preset shortcuts
    pre = p.add_argument_group("preset targets (override --target-* values)")
    pre_grp = pre.add_mutually_exclusive_group()
    pre_grp.add_argument(
        "--streaming",
        action  = "store_true",
        help    = "Preset: Spotify/YouTube  (-14 LUFS, -1 dBTP, 11 LU)",
    )
    pre_grp.add_argument(
        "--apple",
        action  = "store_true",
        help    = "Preset: Apple Music/Tidal (-16 LUFS, -1 dBTP, 11 LU)",
    )
    pre_grp.add_argument(
        "--broadcast",
        action  = "store_true",
        help    = "Preset: EBU R128 Broadcast (-23 LUFS, -1 dBTP, 15 LU)",
    )
    pre_grp.add_argument(
        "--cd",
        action  = "store_true",
        help    = "Preset: CD mastering (-14 LUFS, -0.1 dBTP, 8 LU)",
    )

    # Reports / logging
    rep = p.add_argument_group("reports & logging")
    rep.add_argument(
        "--json-report",
        metavar = "FILE",
        type    = Path,
        default = None,
        help    = "Path for JSON report (default: <input_dir>/loudnorm_report_<ts>.json)",
    )
    rep.add_argument(
        "--text-report",
        metavar = "FILE",
        type    = Path,
        default = None,
        help    = "Path for text report (default: <input_dir>/loudnorm_report_<ts>.txt)",
    )
    rep.add_argument(
        "--log",
        metavar = "FILE",
        type    = Path,
        default = None,
        help    = "Write detailed log to this file",
    )
    rep.add_argument(
        "--verbose", "-v",
        action  = "store_true",
        default = False,
        help    = "Print debug messages to stderr",
    )

    return p


# ──────────────────────────────────────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────────────────────────────────────
def main() -> int:
    parser = build_parser()
    args   = parser.parse_args()

    require_ffmpeg()

    # ── Validate input dir ────────────────────────────────────────────────────
    if not args.input_dir.exists():
        print(col(f"\nERROR: input directory does not exist: {args.input_dir}\n", C.RED, C.BOLD))
        return 2
    if not args.input_dir.is_dir():
        print(col(f"\nERROR: not a directory: {args.input_dir}\n", C.RED, C.BOLD))
        return 2

    # ── Apply presets ─────────────────────────────────────────────────────────
    target_i   = args.target_lufs
    target_tp  = args.target_tp
    target_lra = args.target_lra

    if args.streaming:
        target_i, target_tp, target_lra = -14.0, -1.0, 11.0
    elif args.apple:
        target_i, target_tp, target_lra = -16.0, -1.0, 11.0
    elif args.broadcast:
        target_i, target_tp, target_lra = -23.0, -1.0, 15.0
    elif args.cd:
        target_i, target_tp, target_lra = -14.0, -0.1, 8.0

    # ── Warn on in-place without backup ──────────────────────────────────────
    if args.in_place and not args.backup and not args.dry_run:
        print(col(
            "\n  ⚠  WARNING: --in-place without --backup will permanently overwrite originals.\n"
            "     Add --backup to create .bak copies, or use --dry-run first.\n",
            C.YELLOW, C.BOLD,
        ))

    # ── Workers sanity ────────────────────────────────────────────────────────
    workers = max(1, min(args.workers, 8))

    args_dict = {
        "input_dir":       str(args.input_dir),
        "output_dir":      str(args.output_dir) if args.output_dir else None,
        "in_place":        args.in_place,
        "backup":          args.backup,
        "skip_normalized": args.skip_normalized,
        "dry_run":         args.dry_run,
        "recursive":       args.recursive,
        "target_lufs":     target_i,
        "target_tp":       target_tp,
        "target_lra":      target_lra,
        "tolerance":       args.tolerance,
        "workers":         workers,
    }

    return run_batch(
        input_dir       = args.input_dir,
        output_dir      = args.output_dir,
        in_place        = args.in_place,
        backup          = args.backup,
        skip_normalized = args.skip_normalized,
        dry_run         = args.dry_run,
        recursive       = args.recursive,
        target_i        = target_i,
        target_tp       = target_tp,
        target_lra      = target_lra,
        tolerance       = args.tolerance,
        workers         = workers,
        json_report     = args.json_report,
        text_report     = args.text_report,
        log_path        = args.log,
        verbose         = args.verbose,
        args_dict       = args_dict,
    )


if __name__ == "__main__":
    sys.exit(main())
