#!/usr/bin/env python3
"""
generate_blog.py
Unified static site generator for blog posts.
Converts markdown to HTML, generates preview images, updates posts.json, feed.xml, and sitemap.xml.

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
TEMPLATE_FILE = pathlib.Path(__file__).parent / "templates" / "blog-post.html"
POSTS_JSON = BLOG_DIR / "posts.json"
FEED_XML = pathlib.Path(__file__).parent / "feed.xml"
SITEMAP_XML = pathlib.Path(__file__).parent / "sitemap.xml"
INDEX_HTML = pathlib.Path(__file__).parent / "index.html"
BLOG_INDEX_HTML = BLOG_DIR / "index.html"

# Markdown conversion / post-processing
MARKDOWN_EXTENSIONS = ["tables", "attr_list", "md_in_html", "fenced_code"]
MAX_REFERENCE_LINKS = 20  # Supports [1]..[19]

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

IBM_PLEX_BOLD = pathlib.Path("~/Library/Fonts/IBMPlexSans-Bold.ttf").expanduser()
IBM_PLEX_REGULAR = pathlib.Path("~/Library/Fonts/IBMPlexSans-Regular.ttf").expanduser()

# ------------------------------------------------------------------
# Frontmatter Parser
# ------------------------------------------------------------------
def parse_frontmatter(content: str) -> Tuple[Dict, str]:
    """Parse frontmatter from markdown content."""
    if not content.startswith("---"):
        return {}, content

    parts = content.split("---", 2)
    if len(parts) < 3:
        return {}, content

    _, frontmatter_block, body = parts

    frontmatter = {}
    for line in frontmatter_block.strip().splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        frontmatter[key.strip()] = value.strip().strip('"')

    return frontmatter, body.strip()

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
    footer = f"{date.day} {date.strftime('%B %Y')}  ·  by Daniil Sedov"
    
    # Build background
    bg_full_path = None
    if bg_path:
        # Check if it's relative to the blog post directory
        bg_full_path = output_path.parent / bg_path
        if not bg_full_path.exists():
            bg_full_path = pathlib.Path(bg_path)
    
    img = build_background(bg_full_path)
    draw = ImageDraw.Draw(img)

    f_title = must_font(IBM_PLEX_BOLD, PREVIEW_TITLE_SIZE)
    f_footer = must_font(IBM_PLEX_REGULAR, PREVIEW_FOOT_SIZE)

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
    md = markdown.Markdown(extensions=MARKDOWN_EXTENSIONS)
    
    html = md.convert(content)
    
    # Remove extra newline before </code></pre>
    html = re.sub(r'\n</code></pre>', '</code></pre>', html)
    
    # Don't add IDs to headings - keep them clean
    # The blog.js already handles anchor links
    
    # Replace &amp; with & in headings (h1-h6) - but preserve the ID attributes!
    def fix_heading_ampersands(match):
        heading_content = match.group(0)
        # Only replace &amp; inside the heading text, not in attributes
        # This preserves the id="heading-X" attributes
        heading_content = heading_content.replace('&amp;', '&')
        return heading_content
    
    # Note: This regex preserves heading attributes including IDs
    html = re.sub(r'<h[1-6][^>]*>.*?</h[1-6]>', fix_heading_ampersands, html, flags=re.DOTALL)
    
    # Convert reference numbers like [1], [2] etc. to clickable links
    for i in range(1, MAX_REFERENCE_LINKS):
        html = html.replace(f'[{i}]', f'<a href="#ref-{i}" class="reference-link">[{i}]</a>')
    
    # But don't replace inside code blocks - undo replacements there
    def restore_in_code(match):
        code_block = match.group(0)
        # Restore reference links back to plain text in code blocks
        for i in range(1, MAX_REFERENCE_LINKS):
            code_block = code_block.replace(f'<a href="#ref-{i}" class="reference-link">[{i}]</a>', f'[{i}]')
        return code_block
    
    html = re.sub(r'<code>.*?</code>', restore_in_code, html, flags=re.DOTALL)
    html = re.sub(r'<pre>.*?</pre>', restore_in_code, html, flags=re.DOTALL)
    
    # Add IDs to reference list items for linking
    ref_counter = 1
    def add_ref_id(match):
        nonlocal ref_counter
        ref_item = match.group(0)
        result = ref_item.replace('<li class="reference-item">', f'<li class="reference-item" id="ref-{ref_counter}">')
        ref_counter += 1
        return result
    
    html = re.sub(r'<li class="reference-item">.*?</li>', add_ref_id, html, flags=re.DOTALL)
    
    # Open all non-anchor links in a new tab.
    # Keep in-page anchors like #section working normally.
    def add_link_attrs(match):
        full_match = match.group(0)
        href = match.group(1).strip()

        if not href:
            return full_match

        # Skip in-page navigation and special schemes.
        if href.startswith(('#', 'mailto:', 'tel:', 'javascript:')):
            return full_match

        # Ensure target/rel are present.
        if 'target=' not in full_match:
            full_match = full_match.replace('>', ' target="_blank" rel="noopener">')
        elif 'rel=' not in full_match:
            full_match = full_match.replace('>', ' rel="noopener">')

        return full_match
    
    html = re.sub(r'<a href="([^"]+)"[^>]*>', add_link_attrs, html)
    
    return html

# ------------------------------------------------------------------
# Template Processing
# ------------------------------------------------------------------
def fill_template(template: str, frontmatter: Dict, content: str, slug: str) -> str:
    """Fill the HTML template with content and metadata."""
    # Prepare all replacements
    # Determine post type for template usage
    post_type = frontmatter.get('type', 'research').strip().lower()
    if post_type not in ('research', 'essay', 'project'):
        post_type = 'research'

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
        '{{extra_scripts}}': '',
        '{{post_type}}': post_type,
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
# Posts.json and Feed.xml Management
# ------------------------------------------------------------------
def update_posts_json(posts_data: List[Dict]):
    """Update the posts.json file with current posts."""
    posts_sorted = sorted(posts_data, key=lambda x: x['date'])

    with open(POSTS_JSON, 'w', encoding='utf-8') as f:
        json.dump(posts_sorted, f, indent=4)
    
    print(f"  ✓ Updated posts.json with {len(posts_sorted)} posts")

def generate_sitemap_xml(posts_data: List[Dict]):
    """Generate sitemap.xml for SEO."""
    # Get current date for lastmod
    current_date = datetime.now().strftime('%Y-%m-%d')
    
    sitemap_content = '''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
'''
    
    # Add main pages with appropriate priorities and frequencies
    static_pages = [
        ('https://gusarich.com/', '1.0', 'weekly', current_date),
        ('https://gusarich.com/blog/', '0.9', 'weekly', current_date),
    ]
    
    for url, priority, freq, lastmod in static_pages:
        sitemap_content += f'''  <url>
    <loc>{url}</loc>
    <lastmod>{lastmod}</lastmod>
    <changefreq>{freq}</changefreq>
    <priority>{priority}</priority>
  </url>
'''
    
    # Add blog posts sorted by date (newest first for priority calculation)
    posts_sorted = sorted(posts_data, key=lambda x: x['date'], reverse=True)
    
    for i, post in enumerate(posts_sorted):
        # Calculate priority based on recency (newer posts get higher priority)
        priority = max(0.4, 0.8 - (i * 0.1))
        
        # Use the post date as lastmod
        post_date = post['date']
        
        sitemap_content += f'''  <url>
    <loc>https://gusarich.com/blog/{post['id']}/</loc>
    <lastmod>{post_date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>{priority:.1f}</priority>
  </url>
'''
    
    sitemap_content += '</urlset>\n'
    
    # Write sitemap.xml
    with open(SITEMAP_XML, 'w', encoding='utf-8') as f:
        f.write(sitemap_content)
    
    print(f"  ✓ Generated sitemap.xml with {len(posts_data) + len(static_pages)} URLs")

def generate_feed_xml(posts_data: List[Dict]):
    """Generate RSS feed.xml from posts data."""
    posts_sorted = sorted(posts_data, key=lambda x: x['date'], reverse=True)
    
    # Format date for RSS (RFC 822)
    def format_rss_date(date_str: str, time_str: Optional[str] = None) -> str:
        if time_str:
            # If we have full datetime, use it
            dt = datetime.strptime(time_str, "%Y-%m-%dT%H:%M:%S%z")
        else:
            # Otherwise create from date with default time
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            # Set to 9:30 AM GMT+3 as a default
            dt = dt.replace(hour=9, minute=30, second=0)
        
        # Format to RFC 822 for RSS
        days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        
        day_name = days[dt.weekday()]
        month_name = months[dt.month - 1]
        
        return f"{day_name}, {dt.day:02d} {month_name} {dt.year} {dt.hour:02d}:{dt.minute:02d}:00 +0300"
    
    # Get last build date from most recent post
    last_build_date = format_rss_date(posts_sorted[0]['date'], posts_sorted[0].get('datetime')) if posts_sorted else ""
    
    # Escape HTML entities in text
    def escape_xml(text: str) -> str:
        return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    
    # Build RSS feed
    feed_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Daniil Sedov — Blog</title>
    <link>https://gusarich.com/</link>
    <description>Personal notes on compilers, blockchain, and AI research.</description>
    <language>en-us</language>
    <atom:link href="https://gusarich.com/feed.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>{last_build_date}</lastBuildDate>

'''
    
    # Add items for each post
    for post in posts_sorted:
        title = escape_xml(post['title'])
        link = f"https://gusarich.com/blog/{post['id']}/"
        guid = post['id']
        pub_date = format_rss_date(post['date'], post.get('datetime'))
        description = escape_xml(post['summary'])
        category = escape_xml(post.get('type', 'research'))
        
        feed_content += f'''    <item>
      <title>{title}</title>
      <link>{link}</link>
      <guid isPermaLink="false">{guid}</guid>
      <pubDate>{pub_date}</pubDate>
      <category>{category}</category>
      <description><![CDATA[{post['summary']}]]></description>
    </item>

'''
    
    feed_content += '''  </channel>
</rss>
'''
    
    # Write feed.xml
    with open(FEED_XML, 'w', encoding='utf-8') as f:
        f.write(feed_content)
    
    print(f"  ✓ Generated feed.xml with {len(posts_sorted)} items")


# ------------------------------------------------------------------
# Generated list pages (home + /blog/)
# ------------------------------------------------------------------
HOME_POSTS_START = "<!-- GENERATED:home-posts:start -->"
HOME_POSTS_END = "<!-- GENERATED:home-posts:end -->"
ALL_POSTS_START = "<!-- GENERATED:all-posts:start -->"
ALL_POSTS_END = "<!-- GENERATED:all-posts:end -->"

# Keep the homepage list curated (order matters).
HOME_FEATURED_IDS = [
    "ton-vanity",
    "ai-in-2026",
    "billions-of-tokens-later",
    "fuzzing-with-llms",
]


def _post_type_emoji(post_type: str) -> Tuple[str, str]:
    """Return (emoji, label) for a post type."""
    post_type = (post_type or "").strip().lower()
    if post_type == "essay":
        return "✍️", "Essay"
    if post_type == "project":
        return "🛠️", "Project"
    return "🔬", "Research"


def _render_post_preview_html(post: Dict) -> str:
    emoji, type_label = _post_type_emoji(post.get("type", "research"))
    date_html = format_date_display(post["date"])

    views_html = "0&nbsp;views"

    return f"""<article class="blog-post-preview">
    <h3><span class="post-type-emoji" title="{type_label}">{emoji}</span><a href="/blog/{post['id']}/">{post['title']}</a></h3>
    <div class="post-meta">
        <span class="post-date">{date_html}</span>
        <span class="post-meta-sep">·</span>
        <span class="post-views" data-post-id="{post['id']}">{views_html}</span>
    </div>
</article>"""


def _indent_block(text: str, indent: str) -> str:
    lines = text.splitlines()
    return "\n".join((indent + line if line.strip() else line) for line in lines)


def _replace_generated_block(html: str, start_marker: str, end_marker: str, new_inner_html: str) -> str:
    pattern = re.compile(
        rf"^(?P<indent>[ \t]*){re.escape(start_marker)}\s*\n.*?^(?P=indent){re.escape(end_marker)}\s*$",
        flags=re.MULTILINE | re.DOTALL,
    )
    match = pattern.search(html)
    if not match:
        raise ValueError(f"Could not find generated block markers: {start_marker} .. {end_marker}")

    indent = match.group("indent")
    content = _indent_block(new_inner_html.strip(), indent)
    replacement = f"{indent}{start_marker}\n{content}\n{indent}{end_marker}"
    return pattern.sub(replacement, html, count=1)


def update_generated_lists(posts_data: List[Dict]):
    """Update the static post lists in /index.html and /blog/index.html."""
    posts_newest = sorted(posts_data, key=lambda x: x["date"], reverse=True)
    posts_by_id = {p["id"]: p for p in posts_newest}
    home_posts = [posts_by_id[pid] for pid in HOME_FEATURED_IDS if pid in posts_by_id]

    home_html = "\n".join(_render_post_preview_html(p) for p in home_posts)
    all_html = "\n".join(_render_post_preview_html(p) for p in posts_newest)

    if INDEX_HTML.exists():
        index_content = INDEX_HTML.read_text(encoding="utf-8")
        index_updated = _replace_generated_block(index_content, HOME_POSTS_START, HOME_POSTS_END, home_html)
        if index_updated != index_content:
            INDEX_HTML.write_text(index_updated + "\n", encoding="utf-8")
            print("  ✓ Updated index.html blog list")
    if BLOG_INDEX_HTML.exists():
        blog_index_content = BLOG_INDEX_HTML.read_text(encoding="utf-8")
        blog_index_updated = _replace_generated_block(blog_index_content, ALL_POSTS_START, ALL_POSTS_END, all_html)
        if blog_index_updated != blog_index_content:
            BLOG_INDEX_HTML.write_text(blog_index_updated + "\n", encoding="utf-8")
            print("  ✓ Updated blog/index.html post list")

# ------------------------------------------------------------------
# Main Processing
# ------------------------------------------------------------------
def process_blog_post(slug: str, force: bool = False):
    """Process a single blog post from markdown to HTML."""
    template = TEMPLATE_FILE.read_text(encoding="utf-8")
    return process_blog_post_with_template(slug, template, force=force)


def process_blog_post_with_template(slug: str, template: str, force: bool = False):
    """Process a single blog post from markdown to HTML, using a preloaded template."""
    output_dir = BLOG_DIR / slug
    markdown_file = output_dir / f"{slug}.md"
    output_html = output_dir / "index.html"
    output_preview = output_dir / "preview.jpg"
    
    print(f"\nProcessing: {slug}")
    
    # Check if markdown file exists
    if not markdown_file.exists():
        print(f"  ⚠ Warning: Markdown file not found: {markdown_file}")
        return None
    
    # Read markdown file
    with open(markdown_file, 'r', encoding='utf-8') as f:
        raw_content = f.read()
    
    # Parse frontmatter and content
    frontmatter, markdown_content = parse_frontmatter(raw_content)
    
    if not frontmatter:
        print(f"  ⚠ Warning: No frontmatter found in {markdown_file}")
        return None
    
    # Output directory should already exist since markdown is there
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate HTML
    html_content = process_markdown_content(markdown_content)

    final_html = fill_template(template, frontmatter, html_content, slug)
    
    with open(output_html, 'w', encoding='utf-8') as f:
        f.write(final_html)
    print(f"  ✓ Generated HTML: {output_html}")
    
    # Determine preview background: post-specific or fallback.png at repo root
    background_src = frontmatter.get('background')
    if not background_src:
        background_src = str((pathlib.Path(__file__).parent / 'fallback.png'))

    # Generate preview if needed or forced
    if force or not output_preview.exists():
        generate_preview(
            frontmatter.get('title', 'Untitled'),
            frontmatter.get('date', '2025-01-01'),
            output_preview,
            background_src
        )
    
    # Return metadata for posts.json and feed.xml
    # Determine post type (default to research)
    post_type = frontmatter.get('type', 'research').strip().lower()
    if post_type not in ('research', 'essay', 'project'):
        post_type = 'research'

    metadata = {
        "id": slug,
        "title": frontmatter.get('title', 'Untitled'),
        "date": frontmatter.get('date', '2025-01-01'),
        "summary": frontmatter.get('description', ''),
        "type": post_type,
    }
    
    # Include datetime if available
    if 'datetime' in frontmatter:
        metadata['datetime'] = frontmatter['datetime']
    
    return metadata

def process_all_posts():
    """Process all markdown files found in blog subdirectories."""
    # Find all directories in BLOG_DIR that contain a markdown file
    blog_posts = []
    
    for item in BLOG_DIR.iterdir():
        if item.is_dir() and item.name not in ['posts', 'content']:
            # Check if there's a markdown file with the same name as the directory
            markdown_file = item / f"{item.name}.md"
            if markdown_file.exists():
                blog_posts.append(item.name)

    blog_posts.sort()
    
    if not blog_posts:
        print(f"No blog posts found in {BLOG_DIR}")
        print("Blog posts should be in directories with matching markdown files (e.g., blog/my-post/my-post.md)")
        return
    
    posts_data = []
    template = TEMPLATE_FILE.read_text(encoding="utf-8")
    for slug in blog_posts:
        post_data = process_blog_post_with_template(slug, template)
        if post_data:
            posts_data.append(post_data)
    
    # Update posts.json, feed.xml, and sitemap.xml
    update_posts_json(posts_data)
    generate_feed_xml(posts_data)
    generate_sitemap_xml(posts_data)
    update_generated_lists(posts_data)
    
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
        # Check if the blog post directory and markdown file exist
        blog_dir = BLOG_DIR / args.post
        if not blog_dir.exists() or not (blog_dir / f"{args.post}.md").exists():
            print(f"Error: Blog post not found: {blog_dir}/{args.post}.md")
            print(f"Make sure the blog post directory and markdown file exist")
            sys.exit(1)
        
        post_data = process_blog_post(args.post, force=args.force)
        
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
            generate_feed_xml(posts)
            generate_sitemap_xml(posts)
            update_generated_lists(posts)
    
    elif args.all:
        process_all_posts()
    
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
