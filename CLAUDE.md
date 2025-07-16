# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a static personal website for Daniil Sedov that includes:
- A main landing page with work experience and blog integration
- A blog system with dynamic content loading
- A benchmark dashboard (FKQA) for evaluating LLM performance
- Blog preview generation capabilities

## Development Commands

This is a static website with no build system. All development is done directly with HTML, CSS, and JavaScript files.

**Key Development Tasks:**
- **Run local server**: Use `python3 -m http.server 8000` to serve the site locally
- **Generate blog previews**: Use `python3 generate_preview.py --title "Title" --footer "Date · Author" --out preview.jpg`
- **Test blog functionality**: Load the site and navigate to `/#blog` to test dynamic blog loading

## Architecture

**Static Site Structure:**
- `index.html` - Main landing page with work experience and blog section
- `blog.js` - Core blog functionality including dynamic loading, syntax highlighting, and navigation
- `styles.css` - Global styles with monospace font (DM Mono) and responsive design
- `blog/` - Blog posts directory with individual post folders
- `benchmarks/fkqa/` - Interactive benchmark dashboard for LLM evaluation

**Blog System:**
- Dynamic blog post loading from `blog/posts.json`
- Client-side routing with hash-based navigation
- Syntax highlighting using Shiki library (loaded dynamically)
- Support for custom Tact language grammar
- Table of contents generation for posts with 3+ headings
- Copy-to-clipboard functionality for code blocks

**Key JavaScript Features:**
- `blog.js` handles all blog functionality including post loading, syntax highlighting, and navigation
- Smooth scrolling for hash navigation
- Expandable/collapsible code blocks
- Legacy redirect support for old blog URLs

**FKQA Benchmark:**
- Interactive leaderboard with sorting and filtering
- Model performance comparison across multiple metrics
- Organization and search capability filtering
- Dynamic data loading from JSON files

## File Organization

**Content Structure:**
- Blog posts are stored in individual folders under `blog/`
- Each post has its own `index.html` with content and assets
- Blog metadata is centralized in `blog/posts.json`
- Static assets (favicons, images) are in the root directory

**Key Files:**
- `blog.js` - All blog functionality (routing, rendering, syntax highlighting)
- `generate_preview.py` - Script for creating Open Graph preview images
- `benchmarks/fkqa/index.html` - Benchmark dashboard implementation
- `grammar-tact.json` - Custom grammar for Tact language syntax highlighting

## Important Notes

- Always use `python3` command instead of `python` (Python 2 compatibility)
- The site uses DM Mono font for a monospace aesthetic
- Blog posts support both standard markdown content and custom interactive elements
- Syntax highlighting is loaded lazily only when needed
- The benchmark system uses client-side data processing and filtering