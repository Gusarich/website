#!/usr/bin/env python3
"""
Small local dev server for this repo.

Why not `python3 -m http.server`?
- On some systems `.md` is served as `application/octet-stream`, which makes
  browsers show it as "binary"/garbled instead of readable text.
"""

from __future__ import annotations

import argparse
import os
import pathlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit, urlunsplit


class Handler(SimpleHTTPRequestHandler):
    def guess_type(self, path: str):
        if path.endswith(".md"):
            return "text/markdown; charset=utf-8"
        return super().guess_type(path)

    def _maybe_add_html_suffix(self) -> None:
        split = urlsplit(self.path)
        request_path = split.path

        if request_path == "/" or request_path.endswith("/") or request_path.endswith(".html"):
            return

        candidate_path = request_path.rstrip("/")
        if not candidate_path:
            return

        filesystem_path = self.translate_path(candidate_path)
        if os.path.isfile(filesystem_path):
            return

        html_filesystem_path = filesystem_path + ".html"
        if not os.path.isfile(html_filesystem_path):
            return

        self.path = urlunsplit(
            ("", "", candidate_path + ".html", split.query, split.fragment)
        )

    def do_GET(self) -> None:
        self._maybe_add_html_suffix()
        super().do_GET()

    def do_HEAD(self) -> None:
        self._maybe_add_html_suffix()
        super().do_HEAD()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=80)
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
