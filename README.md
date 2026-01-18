# gusarich.com (static site)

This repo is a fully static website (HTML/CSS/JS) with a small Python generator for blog posts and list pages.

## Source of truth
- Blog content: `blog/<slug>.md` (post assets + generated HTML live in `blog/<slug>/`)
- Templates: `templates/` (shared head snippets in `templates/partials/`)
- Frontend assets: `styles.css`, `tokens.css`, `css/`, `blog.js`, `js/`

Generated outputs are committed (static hosting): `index.html`, `index.md`, `blog.md`, `llms.txt`, `llms-full.txt`, `404.html`, `blog/<slug>/index.html`, `blog/index.html`, `feed.xml`, `sitemap.xml`, `blog/posts.json` (regenerate via `generate_blog.py`).

## Text endpoints
- `/index.md` and `/blog.md`: markdown versions of the home + blog list pages.
- `/blog/<slug>.md`: markdown source for each post.
- `/llms.txt` and `/llms-full.txt`: LLM-friendly index + full dump (generated).

## Local workflow
- Install deps: `pip3 install -r requirements.txt`
- Regenerate everything: `python3 generate_blog.py --all`
- Regenerate one post: `python3 generate_blog.py --post <slug> [--force]`
- Re-render non-post pages only: `python3 generate_blog.py --pages`
- Serve locally: `python3 tools/serve.py --port 8000` then open `http://localhost:8000`

## Backend (optional)
`backend/` is a separate Flask service that proxies live view counts from Plausible.
