#!/usr/bin/env python3
"""
Legacy hook shim (no-op).

This repo used to have a pre-commit hook that updated cache-busting query params
for static assets. That mechanism has since been removed, but some local clones
may still have a `.git/hooks/pre-commit` that invokes this script.

Keeping this file as a no-op avoids noisy errors during `git commit` without
reintroducing any version-bumping behavior.
"""

from __future__ import annotations

import argparse


def main() -> int:
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("-v", "--v", dest="verbose_alias", action="store_true")
    parser.parse_known_args()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

