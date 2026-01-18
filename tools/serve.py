#!/usr/bin/env python3
"""
Small local dev server for this repo.

Why not `python3 -m http.server`?
- On some systems `.md` is served as `application/octet-stream`, which makes
  browsers show it as "binary"/garbled instead of readable text.
"""

from __future__ import annotations

import argparse
import pathlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class Handler(SimpleHTTPRequestHandler):
    def guess_type(self, path: str):
        if path.endswith(".md"):
            return "text/markdown; charset=utf-8"
        return super().guess_type(path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    root = pathlib.Path(__file__).resolve().parents[1]

    server = ThreadingHTTPServer(
        ("0.0.0.0", args.port),
        lambda *handler_args, **handler_kwargs: Handler(
            *handler_args, directory=str(root), **handler_kwargs
        ),
    )
    print(f"Serving {root} on http://localhost:{args.port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
