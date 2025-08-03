#!/usr/bin/env python3
"""
generate_blog.py
Unified static site generator for blog posts.
Converts markdown to HTML, generates preview images, and updates posts.json.

Usage:
    python3 generate_blog.py --post fuzzing-with-llms
    python3 generate_blog.py --all
"""

import argparse
import json
import pathlib
import re
import sys
from datetime import datetime
from typing import Dict, List, Optional, Tuple

# Try to import required libraries
try:
    import markdown
    from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps
except ImportError as e:
    print(f"Error: Missing required library. Please install with:")
    print(f"  pip3 install markdown pillow")
    sys.exit(1)

# ------------------------------------------------------------------
# Constants
# ------------------------------------------------------------------
BLOG_DIR = pathlib.Path(__file__).parent / "blog"
POSTS_DIR = BLOG_DIR / "posts"
TEMPLATE_FILE = BLOG_DIR / "blog-template.html"
POSTS_JSON = BLOG_DIR / "posts.json"

# Preview generation constants
PREVIEW_WIDTH, PREVIEW_HEIGHT = 1200, 630
PREVIEW_PADDING_X = 80
PREVIEW_TITLE_SIZE = 74
PREVIEW_FOOT_SIZE = 36
PREVIEW_TOP_Y = 140

PREVIEW_BG_COLOR = (10, 16, 28)
PREVIEW_STRIPE_COLOR = (18, 30, 48)
PREVIEW_STRIPE_SPACING = 70
PREVIEW_STRIPE_BLUR = 4
PREVIEW_BG_DIM_ALPHA = 0.35

INTER_BOLD = pathlib.Path("~/Library/Fonts/Inter-Bold.ttf").expanduser()
INTER_REGULAR = pathlib.Path("~/Library/Fonts/Inter-Regular.ttf").expanduser()

# ------------------------------------------------------------------
# Frontmatter Parser
# ------------------------------------------------------------------
def parse_frontmatter(content: str) -> Tuple[Dict, str]:
    """Parse frontmatter from markdown content."""
    if not content.startswith('---'):
        return {}, content
    
    try:
        _, fm, body = content.split('---', 2)
        frontmatter = {}
        
        for line in fm.strip().split('\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                key = key.strip()
                value = value.strip().strip('"')
                frontmatter[key] = value
        
        return frontmatter, body.strip()
    except:
        return {}, content

# ------------------------------------------------------------------
# Date Formatting
# ------------------------------------------------------------------
def format_date_display(date_str: str) -> str:
    """Format date for display (e.g., '26 March 2025')."""
    date = datetime.strptime(date_str, "%Y-%m-%d")
    day = date.day
    month = date.strftime("%B")
    year = date.year
    # Use non-breaking spaces
    return f"{day}&nbsp;{month}&nbsp;{year}"

def format_date_iso(date_str: str, datetime_str: Optional[str] = None) -> str:
    """Format date to ISO 8601 with timezone."""
    # If we have a full datetime, use it directly
    if datetime_str:
        return datetime_str
    # Otherwise format from date only
    date = datetime.strptime(date_str, "%Y-%m-%d")
    # Assuming GMT+3 as per the site
    return date.strftime("%Y-%m-%dT%H:%M:%S+03:00")

# ------------------------------------------------------------------
# Preview Generation (from original generate_preview.py)
# ------------------------------------------------------------------
def must_font(path: pathlib.Path, size: int) -> ImageFont.FreeTypeFont:
    if not path.exists():
        print(f"Warning: Font not found: {path}, using default")
        return ImageFont.load_default()
    return ImageFont.truetype(str(path), size)

def wrap(text: str, font: ImageFont.FreeTypeFont, max_width: int, draw: ImageDraw.ImageDraw):
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

def build_background(custom_path: Optional[pathlib.Path]) -> Image.Image:
    """Return a 1200×630 RGB image: custom if provided else procedural."""
    if custom_path and custom_path.exists():
        bg = Image.open(custom_path).convert("RGB")
        bg = ImageOps.fit(bg, (PREVIEW_WIDTH, PREVIEW_HEIGHT), method=Image.Resampling.LANCZOS)
        overlay = Image.new("RGB", (PREVIEW_WIDTH, PREVIEW_HEIGHT), "black")
        bg = Image.blend(bg, overlay, PREVIEW_BG_DIM_ALPHA)
        return bg

    # Procedural navy gradient with diagonal stripes
    bg = Image.new("RGB", (PREVIEW_WIDTH, PREVIEW_HEIGHT), PREVIEW_BG_COLOR)
    tex = Image.new("RGB", (PREVIEW_WIDTH * 2, PREVIEW_HEIGHT), PREVIEW_BG_COLOR)
    tdr = ImageDraw.Draw(tex)
    for x in range(-PREVIEW_WIDTH, PREVIEW_WIDTH * 2, PREVIEW_STRIPE_SPACING):
        tdr.line([(x, 0), (x + PREVIEW_HEIGHT, PREVIEW_HEIGHT)], fill=PREVIEW_STRIPE_COLOR, width=4)
    tex = tex.filter(ImageFilter.GaussianBlur(PREVIEW_STRIPE_BLUR))
    bg.paste(tex.crop((0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT)))
    return bg

def generate_preview(title: str, date_str: str, output_path: pathlib.Path, bg_path: Optional[str] = None):
    """Generate preview image for a blog post."""
    # Format footer
    date = datetime.strptime(date_str, "%Y-%m-%d")
    footer = f"{date.strftime('%d %B %Y')} · by Daniil Sedov"
    
    # Build background
    bg_full_path = None
    if bg_path:
        # Check if it's relative to the blog post directory
        bg_full_path = output_path.parent / bg_path
        if not bg_full_path.exists():
            bg_full_path = pathlib.Path(bg_path)
    
    img = build_background(bg_full_path)
    draw = ImageDraw.Draw(img)

    f_title = must_font(INTER_BOLD, PREVIEW_TITLE_SIZE)
    f_footer = must_font(INTER_REGULAR, PREVIEW_FOOT_SIZE)

    max_w = PREVIEW_WIDTH - 2 * PREVIEW_PADDING_X
    lines = list(wrap(title, f_title, max_w, draw))
    y = PREVIEW_TOP_Y
    for line in lines:
        draw.text((PREVIEW_PADDING_X, y), line, font=f_title, fill="white")
        y += PREVIEW_TITLE_SIZE + 12

    y += 25
    draw.text((PREVIEW_PADDING_X, y), footer, font=f_footer, fill="white")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(output_path, quality=90)
    print(f"  ✓ Preview generated: {output_path}")

# ------------------------------------------------------------------
# Markdown Processing
# ------------------------------------------------------------------
def process_markdown_content(content: str) -> str:
    """Convert markdown to HTML with proper formatting."""
    # Configure markdown extensions
    md = markdown.Markdown(extensions=[
        'fenced_code',
        'tables',
        'attr_list',
        'md_in_html'
    ])
    
    html = md.convert(content)
    
    # Remove extra newline before </code></pre>
    html = re.sub(r'\n</code></pre>', '</code></pre>', html)
    
    # Don't add IDs to headings - keep them clean
    # The blog.js already handles anchor links
    
    # Fix escaped quotes in code blocks
    # Replace &quot; with " in code blocks
    def fix_code_quotes(match):
        code_content = match.group(0)
        # Replace HTML entities back to their characters
        # Important: replace &amp; first to avoid double-unescaping
        code_content = code_content.replace('&amp;', '&')
        code_content = code_content.replace('&quot;', '"')
        code_content = code_content.replace('&lt;', '<')
        code_content = code_content.replace('&gt;', '>')
        code_content = code_content.replace('&#39;', "'")
        code_content = code_content.replace('&apos;', "'")
        return code_content
    
    # Fix quotes in both <pre><code> blocks and standalone <code> blocks
    html = re.sub(r'<pre><code[^>]*>.*?</code></pre>', fix_code_quotes, html, flags=re.DOTALL)
    html = re.sub(r'<code[^>]*>.*?</code>', fix_code_quotes, html, flags=re.DOTALL)
    
    # Replace &amp; with & in headings (h1-h6)
    def fix_heading_ampersands(match):
        heading_content = match.group(0)
        heading_content = heading_content.replace('&amp;', '&')
        return heading_content
    
    html = re.sub(r'<h[1-6][^>]*>.*?</h[1-6]>', fix_heading_ampersands, html, flags=re.DOTALL)
    
    # Add target="_blank" rel="noopener" to external links
    def add_link_attrs(match):
        full_match = match.group(0)
        href = match.group(1)
        # Check if it's an external link
        if href.startswith('http://') or href.startswith('https://'):
            # Check if it's not a local domain
            if 'gusarich.com' not in href:
                # Add target and rel attributes if not already present
                if 'target=' not in full_match:
                    full_match = full_match.replace('>', ' target="_blank" rel="noopener">')
        return full_match
    
    html = re.sub(r'<a href="([^"]+)"[^>]*>', add_link_attrs, html)
    
    return html

# ------------------------------------------------------------------
# Template Processing
# ------------------------------------------------------------------
def fill_template(template: str, frontmatter: Dict, content: str, slug: str) -> str:
    """Fill the HTML template with content and metadata."""
    # Prepare all replacements
    replacements = {
        '{{title}}': frontmatter.get('title', 'Untitled'),
        '{{description}}': frontmatter.get('description', ''),
        '{{slug}}': slug,
        '{{formatted_date}}': format_date_display(frontmatter.get('date', '2025-01-01')),
        '{{iso_date}}': format_date_iso(
            frontmatter.get('date', '2025-01-01'),
            frontmatter.get('datetime')  # Pass the datetime if available
        ),
        '{{content}}': content,
        '{{extra_scripts}}': ''
    }
    
    # Check if we need theme-aware image scripts
    if 'theme_aware_images' in frontmatter and frontmatter['theme_aware_images'] == 'true':
        extra_script = """

            // Set initial image sources based on theme
            document.addEventListener('DOMContentLoaded', function () {
                const isDark =
                    document.documentElement.classList.contains('dark-mode');
                const images = document.querySelectorAll('img[data-base-src]');
                images.forEach((img) => {
                    const baseSrc = img.getAttribute('data-base-src');
                    if (baseSrc) {
                        const themeSrc = baseSrc.replace(
                            '.png',
                            isDark ? '_dark.png' : '_light.png'
                        );
                        img.src = themeSrc;
                    }
                });
            });"""
        replacements['{{extra_scripts}}'] = extra_script
    
    # Replace all placeholders
    result = template
    for key, value in replacements.items():
        result = result.replace(key, value)
    
    return result

# ------------------------------------------------------------------
# Posts.json Management
# ------------------------------------------------------------------
def update_posts_json(posts_data: List[Dict]):
    """Update the posts.json file with current posts."""
    # Sort by date (oldest first)
    posts_data.sort(key=lambda x: x['date'])
    
    with open(POSTS_JSON, 'w') as f:
        json.dump(posts_data, f, indent=4)
    
    print(f"  ✓ Updated posts.json with {len(posts_data)} posts")

# ------------------------------------------------------------------
# Main Processing
# ------------------------------------------------------------------
def process_blog_post(markdown_file: pathlib.Path, force: bool = False):
    """Process a single blog post from markdown to HTML."""
    slug = markdown_file.stem
    output_dir = BLOG_DIR / slug
    output_html = output_dir / "index.html"
    output_preview = output_dir / "preview.jpg"
    
    print(f"\nProcessing: {slug}")
    
    # Read markdown file
    with open(markdown_file, 'r', encoding='utf-8') as f:
        raw_content = f.read()
    
    # Parse frontmatter and content
    frontmatter, markdown_content = parse_frontmatter(raw_content)
    
    if not frontmatter:
        print(f"  ⚠ Warning: No frontmatter found in {markdown_file}")
        return None
    
    # Convert markdown to HTML
    html_content = process_markdown_content(markdown_content)
    
    # Read template
    with open(TEMPLATE_FILE, 'r', encoding='utf-8') as f:
        template = f.read()
    
    # Fill template
    final_html = fill_template(template, frontmatter, html_content, slug)
    
    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Write HTML file
    with open(output_html, 'w', encoding='utf-8') as f:
        f.write(final_html)
    print(f"  ✓ Generated HTML: {output_html}")
    
    # Generate preview if needed or forced
    if force or not output_preview.exists():
        generate_preview(
            frontmatter.get('title', 'Untitled'),
            frontmatter.get('date', '2025-01-01'),
            output_preview,
            frontmatter.get('background')
        )
    
    # Return metadata for posts.json
    return {
        "id": slug,
        "title": frontmatter.get('title', 'Untitled'),
        "date": frontmatter.get('date', '2025-01-01'),
        "summary": frontmatter.get('description', '')
    }

def process_all_posts():
    """Process all markdown files in the posts directory."""
    if not POSTS_DIR.exists():
        POSTS_DIR.mkdir(parents=True, exist_ok=True)
        print(f"Created posts directory: {POSTS_DIR}")
        print("Add markdown files to this directory and run again.")
        return
    
    markdown_files = list(POSTS_DIR.glob("*.md"))
    
    if not markdown_files:
        print(f"No markdown files found in {POSTS_DIR}")
        return
    
    posts_data = []
    for md_file in markdown_files:
        post_data = process_blog_post(md_file)
        if post_data:
            posts_data.append(post_data)
    
    # Update posts.json
    update_posts_json(posts_data)
    
    print(f"\n✅ Processed {len(posts_data)} blog posts")

# ------------------------------------------------------------------
# CLI
# ------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Generate blog posts from markdown")
    parser.add_argument('--post', help="Process a specific post (slug name)")
    parser.add_argument('--all', action='store_true', help="Process all posts")
    parser.add_argument('--force', action='store_true', help="Force regenerate previews")
    
    args = parser.parse_args()
    
    if not TEMPLATE_FILE.exists():
        print(f"Error: Template file not found: {TEMPLATE_FILE}")
        sys.exit(1)
    
    if args.post:
        md_file = POSTS_DIR / f"{args.post}.md"
        if not md_file.exists():
            print(f"Error: Markdown file not found: {md_file}")
            sys.exit(1)
        
        post_data = process_blog_post(md_file, force=args.force)
        
        # Update posts.json with this post
        if post_data:
            posts = []
            if POSTS_JSON.exists():
                with open(POSTS_JSON, 'r') as f:
                    posts = json.load(f)
            
            # Update or add this post
            posts = [p for p in posts if p['id'] != post_data['id']]
            posts.append(post_data)
            update_posts_json(posts)
    
    elif args.all:
        process_all_posts()
    
    else:
        parser.print_help()

if __name__ == "__main__":
    main()