# gusarich.com (static site)

This repo is a fully static website (HTML/CSS/JS) with a small Python generator for blog posts and list pages.

## Source of truth
- Blog content: `blog/<slug>/<slug>.md`
- Templates: `templates/` (shared head snippets in `templates/partials/`)
- Frontend assets: `styles.css`, `tokens.css`, `css/`, `blog.js`, `js/`

Generated outputs are committed (static hosting): `index.html`, `404.html`, `blog/<slug>/index.html`, `blog/index.html`, `feed.xml`, `sitemap.xml`, `blog/posts.json`.

## Local workflow
- Install deps: `pip3 install -r requirements.txt`
- Regenerate everything: `python3 generate_blog.py --all`
- Regenerate one post: `python3 generate_blog.py --post <slug> [--force]`
- Serve locally: `python3 -m http.server 8000` then open `http://localhost:8000`

## Backend (optional)
`backend/` is a separate Flask service that proxies live view counts from Plausible.

