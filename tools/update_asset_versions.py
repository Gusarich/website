#!/usr/bin/env python3
"""
Update cache-busting version query parameters (?v=...) across text assets.

- Scans .html, .css, .js, .xml files (repo-wide) excluding .git/.
- Replaces any occurrence of (?|&)v=<value> with the same new version.
- Safe to re-run; generates a fresh version each time unless --version is provided.

Usage:
  python3 tools/update_asset_versions.py            # apply with generated version
  python3 tools/update_asset_versions.py --version 20250919-abc1
  python3 tools/update_asset_versions.py --dry-run --verbose
"""

from __future__ import annotations

import argparse
import os
import random
import re
import string
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, List


REPO_ROOT = Path(__file__).resolve().parents[1]


def generate_version() -> str:
    now = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    rand = "".join(random.choices(string.ascii_lowercase + string.digits, k=4))
    return f"{now}-{rand}"


def iter_files(root: Path) -> Iterable[Path]:
    exts = {".html", ".css", ".js", ".xml"}
    for p in root.rglob("*"):
        if p.is_dir():
            # Skip VCS and typical build caches (handled by path check below)
            continue
        if p.suffix.lower() in exts:
            # Skip files in .git regardless of suffix
            if any(part == ".git" for part in p.parts):
                continue
            yield p


def replace_versions(text: str, new_version: str) -> str:
    # Match ?v= or &v= followed by allowed token characters
    pattern = re.compile(r"([?&])v=([A-Za-z0-9._-]+)")

    def _repl(m: re.Match) -> str:
        return f"{m.group(1)}v={new_version}"

    return pattern.sub(_repl, text)


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--version", dest="version", default=None, help="Version token to set (default: generated)")
    parser.add_argument("--dry-run", action="store_true", help="Do not write changes; just report")
    parser.add_argument("--verbose", action="store_true", help="Print changed files")
    args = parser.parse_args(argv)

    version = args.version or os.environ.get("ASSET_VERSION") or generate_version()

    changed: List[Path] = []
    for file in iter_files(REPO_ROOT):
        try:
            original = file.read_text(encoding="utf-8")
        except Exception:
            continue

        updated = replace_versions(original, version)
        if updated != original:
            changed.append(file)
            if not args.dry_run:
                file.write_text(updated, encoding="utf-8")

    if args.verbose or args.dry_run:
        if changed:
            print(f"version={version}")
            for p in changed:
                print(p.relative_to(REPO_ROOT))
        else:
            print("No files contained '?v=' tokens to update.")

    # Exit non-zero in dry-run if changes would be made (useful for CI), else 0
    if args.dry_run:
        return 1 if changed else 0

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
