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

## MC PvP Bench

`/mc-pvp-bench` is a static, progressively enhanced leaderboard and interactive SVG cost–Elo chart. Its template is `templates/mc-pvp-bench.html`; styles and interactions are isolated in `css/mc-pvp-bench.css` and `js/mc-pvp-bench*.js`. The leaderboard and CSV are generated from `assets/mc-pvp-bench.json` by `tools/build_mc_pvp_page.py` during `generate_blog.py --pages` (also `--all`). No benchmark dependencies are needed for a normal site build.

Publication exports require an explicit manifest from the benchmark workspace. Its model pool must be the models in the previously pushed website snapshot plus only the additions Daniil requested. Every duel involving another model is excluded from ratings, costs, latency, and head-to-head data. Run `tools/export_mc_pvp_bench.py --source ../mc-pvp-bench --publication <manifest.json>` in the benchmark dependency environment. Use the same manifest for the announcement charts.

After updating the public JSON snapshot, run `python3 generate_blog.py --pages`. The displayed “Last updated” date comes from `generatedAt`; `asOf` records the newest scored match date. Downloads contain aggregate ratings, costs, timing, and head-to-head results. Raw match records, logs, and import tooling are not part of this repository.

Run the benchmark page checks with `node --test tools/test_mc_pvp_bench.mjs`. Keep preview and publication separate: **do not push without Daniil's explicit approval.**
