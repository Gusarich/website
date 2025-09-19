# Repository Guidelines

## Project Structure & Module Organization
- `index.html`, `styles.css`, `tokens.css`, `blog.js`: static site entry and assets.
- `blog/`: blog system — one folder per post (`blog/<slug>/<slug>.md` → generates `blog/<slug>/index.html` and `preview.jpg`). Shared template: `blog/blog-template.html`. Index data: `blog/posts.json`.
- `backend/`: small Flask service proxying Plausible view counts (`viewcount-proxy.py`), with `Dockerfile` and `docker-compose.yml`.
- `assets/`, `benchmarks/`, `tools/`: supplemental images, data, and scripts.

## Build, Test, and Development Commands
- Install deps: `pip3 install -r requirements.txt && pip3 install markdown pillow`.
- Generate all posts: `python3 generate_blog.py --all`.
- Generate a single post: `python3 generate_blog.py --post <slug> [--force]`.
- Serve the static site locally: `python3 -m http.server 8000` then open `http://localhost:8000`.
- Run viewcount backend (Docker): `cd backend && docker compose up -d`; health check: `curl http://localhost:8080/health`.

### Git Hooks
- Install pre-commit hook (cache-busting `?v=` bump): `bash tools/install_hooks.sh`.
- Manually bump without committing: `python3 tools/update_asset_versions.py --verbose`.
- Provide a fixed token if needed: `python3 tools/update_asset_versions.py --version 20250101-0000a`.

## Coding Style & Naming Conventions
- Python: PEP 8, 4‑space indent, snake_case for files (`generate_blog.py`).
- HTML/CSS/JS: 2‑space indent; keep IDs/classes descriptive and kebab-case.
- Blog slugs: kebab-case (`my-first-post`), folder and `.md` name must match.
- No linters are enforced; keep diffs minimal and consistent with surrounding code.

## Testing Guidelines
- No formal test suite. Validate generation by opening `blog/<slug>/index.html` and scanning for broken links, images, code blocks, and reference anchors.
- After `--all`, verify `feed.xml` and `sitemap.xml` regenerate without errors.
- Backend: confirm `/health` and `/api/viewcount/<slug>` with a valid `PLAUSIBLE_API_KEY`.

## Commit & Pull Request Guidelines
- Commits: use Conventional Commits (`feat:`, `fix:`, `docs:`, etc.). Keep them scoped and clear (e.g., `feat: sitemap generation`).
- PRs: include a concise description, linked issues, before/after screenshots for visual changes, and notes on whether `generate_blog.py` was run. Mention any config/env changes (`backend/.env.example`).

## Security & Configuration Tips
- Do not commit secrets. Provide examples in `backend/.env.example`; set `PLAUSIBLE_API_KEY` locally or via Docker env.
- Static hosting uses `.nojekyll`; avoid introducing build-only artifacts into the repo.
