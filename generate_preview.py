#!/usr/bin/env python3
"""
generate_preview.py
Create a 1200 × 630 Open-Graph image for a blog post.

NEW --bg parameter
------------------
If you pass --bg path/to/img.[jpg|png|webp] the script
  • loads that image,
  • center-crops / resizes to 1200 × 630,
  • dims it slightly for legible text,
  • skips the procedural navy texture.

Example
-------
python generate_preview.py                              \
       --title  "Documentation-Driven Compiler Fuzzing" \
       --footer "26 March 2025 · by Daniil Sedov"       \
       --bg     assets/og_bg_abstract.jpg               \
       --out    preview.jpg
"""

import argparse, pathlib, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

# ------------------------------------------------------------------
# Constants
# ------------------------------------------------------------------
WIDTH, HEIGHT = 1200, 630
PADDING_X = 80
TITLE_SIZE = 74
FOOT_SIZE = 36
TOP_Y = 140

BG_COLOR = (10, 16, 28)
STRIPE_COLOR = (18, 30, 48)
STRIPE_SPACING = 70
STRIPE_BLUR = 4
BG_DIM_ALPHA = 0.35  # how much to darken custom bg

INTER_BOLD = pathlib.Path("~/Library/Fonts/Inter-Bold.ttf").expanduser()
INTER_REGULAR = pathlib.Path("~/Library/Fonts/Inter-Regular.ttf").expanduser()


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------
def must_font(path: pathlib.Path, size: int) -> ImageFont.FreeTypeFont:
    if not path.exists():
        sys.exit(f"🛑  Font not found: {path}")
    return ImageFont.truetype(str(path), size)


def wrap(
    text: str, font: ImageFont.FreeTypeFont, max_width: int, draw: ImageDraw.ImageDraw
):
    words, line = text.split(), ""
    for w in words:
        test = f"{line} {w}".strip()
        if draw.textlength(test, font=font) <= max_width:
            line = test
        else:
            yield line
            line = w
    if line:
        yield line


def build_background(custom_path: pathlib.Path | None) -> Image.Image:
    """Return a 1200×630 RGB image: custom if provided else procedural."""
    if custom_path:
        if not custom_path.exists():
            sys.exit(f"🛑  Background image not found: {custom_path}")
        bg = Image.open(custom_path).convert("RGB")
        # center-crop and resize while preserving aspect
        bg = ImageOps.fit(bg, (WIDTH, HEIGHT), method=Image.Resampling.LANCZOS)
        # dim for contrast
        overlay = Image.new("RGB", (WIDTH, HEIGHT), "black")
        bg = Image.blend(bg, overlay, BG_DIM_ALPHA)
        return bg

    # ---- procedural navy gradient with diagonal stripes ----
    bg = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    tex = Image.new("RGB", (WIDTH * 2, HEIGHT), BG_COLOR)
    tdr = ImageDraw.Draw(tex)
    for x in range(-WIDTH, WIDTH * 2, STRIPE_SPACING):
        tdr.line([(x, 0), (x + HEIGHT, HEIGHT)], fill=STRIPE_COLOR, width=4)
    tex = tex.filter(ImageFilter.GaussianBlur(STRIPE_BLUR))
    bg.paste(tex.crop((0, 0, WIDTH, HEIGHT)))
    return bg


# ------------------------------------------------------------------
# Core
# ------------------------------------------------------------------
def make_og(title: str, footer: str, outfile: str, bg_path: str | None):
    img = build_background(pathlib.Path(bg_path) if bg_path else None)
    draw = ImageDraw.Draw(img)

    f_title = must_font(INTER_BOLD, TITLE_SIZE)
    f_footer = must_font(INTER_REGULAR, FOOT_SIZE)

    max_w = WIDTH - 2 * PADDING_X
    lines = list(wrap(title, f_title, max_w, draw))
    y = TOP_Y
    for line in lines:
        draw.text((PADDING_X, y), line, font=f_title, fill="white")
        y += TITLE_SIZE + 12

    if footer:
        y += 25
        draw.text((PADDING_X, y), footer, font=f_footer, fill="white")

    pathlib.Path(outfile).parent.mkdir(parents=True, exist_ok=True)
    img.save(outfile, quality=90)
    print(f"✓  Preview written to {outfile}")


# ------------------------------------------------------------------
# CLI
# ------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--title", required=True, help="Main headline")
    ap.add_argument("--footer", default="", help="Date · author block")
    ap.add_argument(
        "--out", default="preview.jpg", help="Output image file (default: preview.jpg)"
    )
    ap.add_argument("--bg", help="Custom background image (optional)")
    args = ap.parse_args()
    make_og(args.title, args.footer, args.out, args.bg)


if __name__ == "__main__":
    main()
