#!/usr/bin/env python3
"""
Image Enhancement Pipeline - Modern TUI
Target a folder, scale images to chosen dimensions, then upscale/enhance them.
Fully deterministic (seeded operations, fixed model weights, no randomness).

Dependencies:
    pip install Pillow numpy opencv-python rich realesrgan basicsr facexlib gfpgan torch torchvision

Or for a lighter setup without deep learning models:
    pip install Pillow numpy opencv-python rich

Usage:
    python image_enhancer.py /path/to/images
"""

import os
import sys
import argparse
import hashlib
import json
import time
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import List, Optional, Tuple, Callable
import threading
import queue

# Image processing
from PIL import Image, ImageFilter, ImageEnhance, ImageOps
import numpy as np

# TUI
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, BarColumn, TextColumn, TimeElapsedColumn, TaskID
from rich.table import Table
from rich.layout import Layout
from rich.live import Live
from rich.text import Text
from rich.prompt import Prompt, Confirm, IntPrompt, FloatPrompt
from rich.align import Align
from rich import box

# Optional: OpenCV for additional processing
try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False

# Optional: Real-ESRGAN for AI upscaling
try:
    import torch
    from realesrgan import RealESRGANer
    from basicsr.archs.rrdbnet_arch import RRDBNet
    HAS_REALESRGAN = True
except ImportError:
    HAS_REALESRGAN = False

# Optional: GFPGAN for face enhancement
try:
    from gfpgan import GFPGANer
    HAS_GFPGAN = True
except ImportError:
    HAS_GFPGAN = False


console = Console()


@dataclass
class EnhancementConfig:
    """Deterministic configuration for the enhancement pipeline."""
    target_width: Optional[int] = None
    target_height: Optional[int] = None
    maintain_aspect: bool = True
    upscale_factor: int = 2
    use_ai_upscale: bool = False
    ai_model: str = "RealESRGAN_x4plus"
    use_face_enhance: bool = False
    sharpen_amount: float = 1.0
    denoise_strength: float = 0.0
    contrast_boost: float = 1.0
    saturation_boost: float = 1.0
    output_format: str = "png"
    output_quality: int = 95
    output_suffix: str = "_enhanced"
    seed: int = 42
    tile_size: int = 512
    deterministic: bool = True

    def to_dict(self) -> dict:
        return asdict(self)

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)


class DeterministicRandom:
    """Deterministic pseudo-random number generator for reproducibility."""

    def __init__(self, seed: int = 42):
        self.seed = seed
        self.state = seed

    def _next(self) -> int:
        # LCG parameters (Numerical Recipes)
        self.state = (1664525 * self.state + 1013904223) & 0xFFFFFFFF
        return self.state

    def random(self) -> float:
        return self._next() / 0xFFFFFFFF

    def randint(self, a: int, b: int) -> int:
        return a + (self._next() % (b - a + 1))

    def choice(self, seq):
        return seq[self.randint(0, len(seq) - 1)]

    def shuffle(self, seq):
        for i in range(len(seq) - 1, 0, -1):
            j = self.randint(0, i)
            seq[i], seq[j] = seq[j], seq[i]


class ImageEnhancer:
    """Main image enhancement engine with deterministic operations."""

    SUPPORTED_FORMATS = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.webp'}

    def __init__(self, config: EnhancementConfig):
        self.config = config
        self.rng = DeterministicRandom(config.seed)
        self._init_ai_models()

    def _init_ai_models(self):
        """Initialize AI upscaling models deterministically."""
        self.esrgan_upsampler = None
        self.gfpan_enhancer = None

        if self.config.use_ai_upscale and HAS_REALESRGAN:
            try:
                # Set deterministic PyTorch behavior
                torch.manual_seed(self.config.seed)
                torch.backends.cudnn.deterministic = True
                torch.backends.cudnn.benchmark = False

                model = RRDBNet(
                    num_in_ch=3, num_out_ch=3, num_feat=64,
                    num_block=23, num_grow_ch=32, scale=4
                )

                model_path = self._get_model_path(self.config.ai_model)

                self.esrgan_upsampler = RealESRGANer(
                    scale=4,
                    model_path=model_path,
                    model=model,
                    tile=self.config.tile_size,
                    tile_pad=10,
                    pre_pad=0,
                    half=False,  # Use full precision for determinism
                    gpu_id=None  # Auto-select
                )
            except Exception as e:
                console.print(f"[yellow]Warning: Could not load Real-ESRGAN model: {e}[/yellow]")
                self.esrgan_upsampler = None

        if self.config.use_face_enhance and HAS_GFPGAN:
            try:
                self.gfpan_enhancer = GFPGANer(
                    model_path='https://github.com/TencentARC/GFPGAN/releases/download/v1.3.0/GFPGANv1.3.pth',
                    upscale=2,
                    arch='clean',
                    channel_multiplier=2,
                    bg_upsampler=self.esrgan_upsampler
                )
            except Exception as e:
                console.print(f"[yellow]Warning: Could not load GFPGAN model: {e}[/yellow]")
                self.gfpan_enhancer = None

    def _get_model_path(self, model_name: str) -> str:
        """Get model path, downloading if necessary."""
        # Model URLs from Real-ESRGAN releases
        model_urls = {
            "RealESRGAN_x4plus": "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth",
            "RealESRGAN_x4plus_anime_6B": "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.2.4/RealESRGAN_x4plus_anime_6B.pth",
            "RealESRGAN_x2plus": "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.1/RealESRGAN_x2plus.pth",
        }

        # Local weights directory
        weights_dir = Path.home() / ".image_enhancer" / "weights"
        weights_dir.mkdir(parents=True, exist_ok=True)

        model_file = weights_dir / f"{model_name}.pth"

        if not model_file.exists():
            console.print(f"[blue]Downloading {model_name} model...[/blue]")
            import urllib.request
            url = model_urls.get(model_name, model_urls["RealESRGAN_x4plus"])
            urllib.request.urlretrieve(url, model_file)
            console.print(f"[green]Model downloaded to {model_file}[/green]")

        return str(model_file)

    def get_image_files(self, folder_path: Path) -> List[Path]:
        """Get all supported image files from folder."""
        files = []
        for ext in self.SUPPORTED_FORMATS:
            files.extend(folder_path.glob(f"*{ext}"))
            files.extend(folder_path.glob(f"*{ext.upper()}"))

        # Deterministic sorting
        files = sorted(files, key=lambda p: p.name)
        return files

    def scale_image(self, img: Image.Image) -> Image.Image:
        """Scale image to target dimensions deterministically."""
        if self.config.target_width is None and self.config.target_height is None:
            return img

        orig_w, orig_h = img.size

        if self.config.maintain_aspect:
            if self.config.target_width and self.config.target_height:
                # Fit within box, maintaining aspect ratio
                ratio = min(
                    self.config.target_width / orig_w,
                    self.config.target_height / orig_h
                )
                new_w = int(orig_w * ratio)
                new_h = int(orig_h * ratio)
            elif self.config.target_width:
                ratio = self.config.target_width / orig_w
                new_w = self.config.target_width
                new_h = int(orig_h * ratio)
            else:
                ratio = self.config.target_height / orig_h
                new_w = int(orig_w * ratio)
                new_h = self.config.target_height
        else:
            new_w = self.config.target_width or orig_w
            new_h = self.config.target_height or orig_h

        # Use LANCZOS for high-quality deterministic downsampling
        return img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    def apply_sharpening(self, img: Image.Image) -> Image.Image:
        """Apply deterministic sharpening."""
        if self.config.sharpen_amount <= 0:
            return img

        # Use UnsharpMask for better control than simple sharpen
        sharpened = img.filter(
            ImageFilter.UnsharpMask(
                radius=2,
                percent=int(150 * self.config.sharpen_amount),
                threshold=3
            )
        )
        return sharpened

    def apply_denoising(self, img: Image.Image) -> Image.Image:
        """Apply deterministic denoising."""
        if self.config.denoise_strength <= 0:
            return img

        # Use median filter for denoising (deterministic)
        radius = int(self.config.denoise_strength * 2)
        radius = max(1, min(radius, 5))
        return img.filter(ImageFilter.MedianFilter(size=radius * 2 + 1))

    def apply_color_enhancement(self, img: Image.Image) -> Image.Image:
        """Apply deterministic color/contrast/saturation adjustments."""
        if self.config.contrast_boost != 1.0:
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(self.config.contrast_boost)

        if self.config.saturation_boost != 1.0:
            enhancer = ImageEnhance.Color(img)
            img = enhancer.enhance(self.config.saturation_boost)

        return img

    def ai_upscale(self, img: Image.Image) -> Image.Image:
        """Upscale using Real-ESRGAN deterministically."""
        if not self.esrgan_upsampler:
            # Fallback: bicubic upscaling
            w, h = img.size
            return img.resize(
                (w * self.config.upscale_factor, h * self.config.upscale_factor),
                Image.Resampling.LANCZOS
            )

        # Convert PIL to numpy (RGB)
        img_np = np.array(img)

        # Real-ESRGAN expects BGR
        img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR) if HAS_CV2 else img_np

        try:
            output, _ = self.esrgan_upsampler.enhance(
                img_bgr,
                outscale=self.config.upscale_factor
            )
            # Convert back to RGB PIL
            if HAS_CV2:
                output_rgb = cv2.cvtColor(output, cv2.COLOR_BGR2RGB)
            else:
                output_rgb = output
            return Image.fromarray(output_rgb)
        except Exception as e:
            console.print(f"[yellow]AI upscale failed: {e}, using LANCZOS[/yellow]")
            w, h = img.size
            return img.resize(
                (w * self.config.upscale_factor, h * self.config.upscale_factor),
                Image.Resampling.LANCZOS
            )

    def enhance_faces(self, img: Image.Image) -> Image.Image:
        """Enhance faces using GFPGAN."""
        if not self.gfpan_enhancer:
            return img

        img_np = np.array(img)
        img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR) if HAS_CV2 else img_np

        try:
            _, _, output = self.gfpan_enhancer.enhance(
                img_bgr,
                has_aligned=False,
                only_center_face=False,
                paste_back=True
            )
            if HAS_CV2:
                output_rgb = cv2.cvtColor(output, cv2.COLOR_BGR2RGB)
            else:
                output_rgb = output
            return Image.fromarray(output_rgb)
        except Exception as e:
            console.print(f"[yellow]Face enhancement failed: {e}[/yellow]")
            return img

    def process_image(self, input_path: Path, output_path: Path) -> dict:
        """Process a single image through the full pipeline."""
        start_time = time.time()

        # Load image
        img = Image.open(input_path).convert("RGB")
        original_size = img.size

        # Step 1: Scale to target dimensions
        img = self.scale_image(img)
        scaled_size = img.size

        # Step 2: AI Upscale (if enabled)
        if self.config.upscale_factor > 1:
            if self.config.use_ai_upscale and self.esrgan_upsampler:
                img = self.ai_upscale(img)
            else:
                w, h = img.size
                img = img.resize(
                    (w * self.config.upscale_factor, h * self.config.upscale_factor),
                    Image.Resampling.LANCZOS
                )

        # Step 3: Face enhancement (if enabled)
        if self.config.use_face_enhance:
            img = self.enhance_faces(img)

        # Step 4: Apply filters
        img = self.apply_denoising(img)
        img = self.apply_sharpening(img)
        img = self.apply_color_enhancement(img)

        # Step 5: Save with deterministic settings
        save_kwargs = {}
        if self.config.output_format.lower() in ('jpg', 'jpeg'):
            save_kwargs['quality'] = self.config.output_quality
            save_kwargs['optimize'] = True
            save_kwargs['progressive'] = True
        elif self.config.output_format.lower() == 'png':
            save_kwargs['optimize'] = True
        elif self.config.output_format.lower() == 'webp':
            save_kwargs['quality'] = self.config.output_quality
            save_kwargs['method'] = 6  # Best compression, deterministic

        img.save(output_path, **save_kwargs)

        elapsed = time.time() - start_time

        return {
            'input_path': str(input_path),
            'output_path': str(output_path),
            'original_size': original_size,
            'final_size': img.size,
            'elapsed_time': elapsed,
            'success': True
        }

    def process_batch(self, folder_path: Path, progress_callback: Optional[Callable] = None) -> List[dict]:
        """Process all images in a folder."""
        image_files = self.get_image_files(folder_path)

        if not image_files:
            return []

        # Create output directory
        output_dir = folder_path / f"enhanced_{self.config.seed}"
        output_dir.mkdir(exist_ok=True)

        results = []
        for i, img_path in enumerate(image_files):
            output_name = f"{img_path.stem}{self.config.output_suffix}.{self.config.output_format}"
            output_path = output_dir / output_name

            try:
                result = self.process_image(img_path, output_path)
                results.append(result)
            except Exception as e:
                results.append({
                    'input_path': str(img_path),
                    'output_path': str(output_path),
                    'error': str(e),
                    'success': False
                })

            if progress_callback:
                progress_callback(i + 1, len(image_files), img_path.name)

        return results


class EnhancementTUI:
    """Modern Terminal User Interface for image enhancement."""

    def __init__(self):
        self.config = EnhancementConfig()
        self.console = Console()

    def show_banner(self):
        """Display application banner."""
        banner = Panel.fit(
            Text.from_markup(
                "[bold cyan]╔═══════════════════════════════════════╗[/bold cyan]
"
                "[bold cyan]║[/bold cyan]  [bold white]Image Enhancement Pipeline[/bold white]          [bold cyan]║[/bold cyan]
"
                "[bold cyan]║[/bold cyan]  [dim]Scale → Upscale → Enhance → Export[/dim]  [bold cyan]║[/bold cyan]
"
                "[bold cyan]╚═══════════════════════════════════════╝[/bold cyan]
"
                "[green]Fully Deterministic[/green] | [blue]AI-Powered[/blue] | [yellow]Batch Processing[/yellow]"
            ),
            border_style="cyan",
            padding=(1, 2)
        )
        self.console.print(banner)

    def show_config_summary(self):
        """Display current configuration."""
        table = Table(title="Current Configuration", box=box.ROUNDED)
        table.add_column("Setting", style="cyan", no_wrap=True)
        table.add_column("Value", style="green")

        cfg = self.config
        table.add_row("Target Width", str(cfg.target_width) if cfg.target_width else "Original")
        table.add_row("Target Height", str(cfg.target_height) if cfg.target_height else "Original")
        table.add_row("Maintain Aspect Ratio", "Yes" if cfg.maintain_aspect else "No")
        table.add_row("Upscale Factor", f"{cfg.upscale_factor}x")
        table.add_row("AI Upscale", "Enabled" if cfg.use_ai_upscale else "Disabled")
        if cfg.use_ai_upscale:
            table.add_row("AI Model", cfg.ai_model)
        table.add_row("Face Enhancement", "Enabled" if cfg.use_face_enhance else "Disabled")
        table.add_row("Sharpen Amount", f"{cfg.sharpen_amount:.2f}")
        table.add_row("Denoise Strength", f"{cfg.denoise_strength:.2f}")
        table.add_row("Contrast Boost", f"{cfg.contrast_boost:.2f}")
        table.add_row("Saturation Boost", f"{cfg.saturation_boost:.2f}")
        table.add_row("Output Format", cfg.output_format.upper())
        table.add_row("Output Quality", f"{cfg.output_quality}")
        table.add_row("Output Suffix", cfg.output_suffix)
        table.add_row("Deterministic Seed", f"{cfg.seed}")
        table.add_row("Tile Size", f"{cfg.tile_size}")

        self.console.print(table)

    def configure_pipeline(self):
        """Interactive configuration wizard."""
        self.console.print("
[bold underline]Configure Enhancement Pipeline[/bold underline]
")

        # Target dimensions
        self.console.print("[cyan]Step 1: Target Dimensions[/cyan]")
        target_w = Prompt.ask("Target width (px, or blank to keep original)", default="")
        self.config.target_width = int(target_w) if target_w.strip() else None

        target_h = Prompt.ask("Target height (px, or blank to keep original)", default="")
        self.config.target_height = int(target_h) if target_h.strip() else None

        if self.config.target_width or self.config.target_height:
            self.config.maintain_aspect = Confirm.ask("Maintain aspect ratio?", default=True)

        # Upscale settings
        self.console.print("
[cyan]Step 2: Upscaling[/cyan]")
        self.config.upscale_factor = IntPrompt.ask(
            "Upscale factor (1-8)", default=2
        )

        if HAS_REALESRGAN:
            self.config.use_ai_upscale = Confirm.ask(
                "Use AI upscaling (Real-ESRGAN)?", default=False
            )
            if self.config.use_ai_upscale:
                models = ["RealESRGAN_x4plus", "RealESRGAN_x4plus_anime_6B", "RealESRGAN_x2plus"]
                self.console.print("Available models:")
                for i, m in enumerate(models, 1):
                    self.console.print(f"  {i}. {m}")
                choice = IntPrompt.ask("Select model", default=1)
                self.config.ai_model = models[choice - 1]
        else:
            self.console.print("[yellow]Real-ESRGAN not available. Install with: pip install realesrgan basicsr[/yellow]")

        # Face enhancement
        if HAS_GFPGAN:
            self.config.use_face_enhance = Confirm.ask(
                "Enable face enhancement (GFPGAN)?", default=False
            )

        # Enhancement filters
        self.console.print("
[cyan]Step 3: Enhancement Filters[/cyan]")
        self.config.sharpen_amount = FloatPrompt.ask(
            "Sharpen amount (0.0-3.0)", default=1.0
        )
        self.config.denoise_strength = FloatPrompt.ask(
            "Denoise strength (0.0-2.0)", default=0.0
        )
        self.config.contrast_boost = FloatPrompt.ask(
            "Contrast boost (0.5-2.0)", default=1.0
        )
        self.config.saturation_boost = FloatPrompt.ask(
            "Saturation boost (0.5-2.0)", default=1.0
        )

        # Output settings
        self.console.print("
[cyan]Step 4: Output Settings[/cyan]")
        fmt = Prompt.ask("Output format", choices=["png", "jpg", "webp"], default="png")
        self.config.output_format = fmt

        if fmt in ("jpg", "webp"):
            self.config.output_quality = IntPrompt.ask(
                "Output quality (1-100)", default=95
            )

        self.config.output_suffix = Prompt.ask(
            "Output filename suffix", default="_enhanced"
        )

        # Determinism
        self.console.print("
[cyan]Step 5: Determinism[/cyan]")
        self.config.seed = IntPrompt.ask(
            "Random seed (for reproducibility)", default=42
        )

        if self.config.use_ai_upscale:
            self.config.tile_size = IntPrompt.ask(
                "Tile size (for memory management)", default=512
            )

    def run_enhancement(self, folder_path: Path):
        """Run the enhancement pipeline with live progress."""
        enhancer = ImageEnhancer(self.config)
        image_files = enhancer.get_image_files(folder_path)

        if not image_files:
            self.console.print(f"[red]No supported images found in {folder_path}[/red]")
            return

        self.console.print(f"
[green]Found {len(image_files)} image(s) to process[/green]
")

        # Show config
        self.show_config_summary()

        if not Confirm.ask("
Proceed with enhancement?", default=True):
            return

        # Create output directory
        output_dir = folder_path / f"enhanced_{self.config.seed}"

        # Progress tracking
        results = []
        failed = []

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(complete_style="green", finished_style="green"),
            TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
            TimeElapsedColumn(),
            console=self.console,
            transient=False
        ) as progress:

            task = progress.add_task(
                f"[cyan]Enhancing images...[/cyan]",
                total=len(image_files)
            )

            for i, img_path in enumerate(image_files):
                progress.update(task, description=f"[cyan]Processing {img_path.name}...[/cyan]")

                output_name = f"{img_path.stem}{self.config.output_suffix}.{self.config.output_format}"
                output_path = output_dir / output_name

                try:
                    result = enhancer.process_image(img_path, output_path)
                    results.append(result)
                    progress.update(task, advance=1)
                except Exception as e:
                    failed.append((img_path.name, str(e)))
                    progress.update(task, advance=1)

        # Summary
        self.show_results(results, failed, output_dir)

    def show_results(self, results: List[dict], failed: List[Tuple[str, str]], output_dir: Path):
        """Display processing results."""
        self.console.print("
")

        if results:
            success_panel = Panel(
                f"[bold green]Successfully processed {len(results)} image(s)[/bold green]
"
                f"Output directory: [cyan]{output_dir}[/cyan]",
                border_style="green",
                title="Success"
            )
            self.console.print(success_panel)

            # Detail table
            table = Table(title="Processing Details", box=box.SIMPLE)
            table.add_column("File", style="cyan")
            table.add_column("Original Size", style="dim")
            table.add_column("Final Size", style="green")
            table.add_column("Time", style="yellow")

            for r in results:
                orig = f"{r['original_size'][0]}x{r['original_size'][1]}"
                final = f"{r['final_size'][0]}x{r['final_size'][1]}"
                t = f"{r['elapsed_time']:.2f}s"
                table.add_row(
                    Path(r['input_path']).name,
                    orig,
                    final,
                    t
                )

            self.console.print(table)

        if failed:
            fail_panel = Panel(
                "
".join([f"[red]• {name}[/red]: {err}" for name, err in failed]),
                border_style="red",
                title=f"Failed ({len(failed)})"
            )
            self.console.print(fail_panel)

        # Save config to output dir for reproducibility
        config_path = output_dir / "enhancement_config.json"
        with open(config_path, 'w') as f:
            f.write(self.config.to_json())
        self.console.print(f"
[dim]Config saved to {config_path}[/dim]")


def main():
    parser = argparse.ArgumentParser(
        description="Image Enhancement Pipeline - Scale, Upscale & Enhance Images"
    )
    parser.add_argument(
        "path",
        nargs="?",
        help="Path to folder containing images"
    )
    parser.add_argument(
        "--width", "-w",
        type=int,
        help="Target width in pixels"
    )
    parser.add_argument(
        "--height", "-h",
        type=int,
        help="Target height in pixels"
    )
    parser.add_argument(
        "--upscale", "-u",
        type=int,
        default=2,
        help="Upscale factor (default: 2)"
    )
    parser.add_argument(
        "--ai",
        action="store_true",
        help="Use AI upscaling (Real-ESRGAN)"
    )
    parser.add_argument(
        "--model",
        default="RealESRGAN_x4plus",
        choices=["RealESRGAN_x4plus", "RealESRGAN_x4plus_anime_6B", "RealESRGAN_x2plus"],
        help="AI model to use"
    )
    parser.add_argument(
        "--face",
        action="store_true",
        help="Enable face enhancement (GFPGAN)"
    )
    parser.add_argument(
        "--sharpen",
        type=float,
        default=1.0,
        help="Sharpen amount (0.0-3.0)"
    )
    parser.add_argument(
        "--denoise",
        type=float,
        default=0.0,
        help="Denoise strength (0.0-2.0)"
    )
    parser.add_argument(
        "--contrast",
        type=float,
        default=1.0,
        help="Contrast boost (0.5-2.0)"
    )
    parser.add_argument(
        "--saturation",
        type=float,
        default=1.0,
        help="Saturation boost (0.5-2.0)"
    )
    parser.add_argument(
        "--format",
        default="png",
        choices=["png", "jpg", "webp"],
        help="Output format"
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=95,
        help="Output quality for lossy formats (1-100)"
    )
    parser.add_argument(
        "--suffix",
        default="_enhanced",
        help="Output filename suffix"
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Deterministic seed for reproducibility"
    )
    parser.add_argument(
        "--tile",
        type=int,
        default=512,
        help="Tile size for AI processing"
    )
    parser.add_argument(
        "--no-aspect",
        action="store_true",
        help="Do not maintain aspect ratio"
    )
    parser.add_argument(
        "--config",
        help="Load configuration from JSON file"
    )
    parser.add_argument(
        "--save-config",
        help="Save configuration to JSON file and exit"
    )

    args = parser.parse_args()

    tui = EnhancementTUI()

    # Load config from file if specified
    if args.config:
        with open(args.config) as f:
            config_dict = json.load(f)
            tui.config = EnhancementConfig(**config_dict)

    # Apply CLI args
    if args.width:
        tui.config.target_width = args.width
    if args.height:
        tui.config.target_height = args.height
    tui.config.upscale_factor = args.upscale
    tui.config.use_ai_upscale = args.ai
    tui.config.ai_model = args.model
    tui.config.use_face_enhance = args.face
    tui.config.sharpen_amount = args.sharpen
    tui.config.denoise_strength = args.denoise
    tui.config.contrast_boost = args.contrast
    tui.config.saturation_boost = args.saturation
    tui.config.output_format = args.format
    tui.config.output_quality = args.quality
    tui.config.output_suffix = args.suffix
    tui.config.seed = args.seed
    tui.config.tile_size = args.tile
    tui.config.maintain_aspect = not args.no_aspect

    # Save config and exit
    if args.save_config:
        with open(args.save_config, 'w') as f:
            f.write(tui.config.to_json())
        console.print(f"[green]Configuration saved to {args.save_config}[/green]")
        return

    tui.show_banner()

    # Determine target path
    if args.path:
        target_path = Path(args.path).resolve()
    else:
        path_input = Prompt.ask("Enter path to image folder")
        target_path = Path(path_input).resolve()

    if not target_path.exists():
        console.print(f"[red]Error: Path does not exist: {target_path}[/red]")
        sys.exit(1)

    if not target_path.is_dir():
        console.print(f"[red]Error: Path is not a directory: {target_path}[/red]")
        sys.exit(1)

    # If no CLI args provided for processing, show interactive config
    if not any([
        args.width, args.height, args.ai, args.face,
        args.sharpen != 1.0, args.denoise != 0.0,
        args.contrast != 1.0, args.saturation != 1.0,
        args.upscale != 2
    ]) and not args.config:
        tui.configure_pipeline()

    tui.run_enhancement(target_path)


if __name__ == "__main__":
    main()
