#!/usr/bin/env python3
"""Fail if any internal link or asset in a built site points at a file that doesn't exist.

Usage: check-links.py <site or stage dir>
Run before every Cloudflare Pages deploy (home-server watcher) and by the checks-only GitHub workflow.
Checks href/src values that start with "/" (site-relative); external links are not fetched.
"""
import os
import re
import sys
import urllib.parse

root = sys.argv[1]
bad, seen = [], 0
for d, _, files in os.walk(root):
    for f in files:
        if not f.endswith(".html"):
            continue
        path = os.path.join(d, f)
        html = open(path, encoding="utf-8", errors="replace").read()
        for url in re.findall(r'(?:href|src)="(/[^"#?]*)', html):
            if url.startswith("//"):          # protocol-relative = external
                continue
            seen += 1
            t = os.path.join(root, urllib.parse.unquote(url).lstrip("/"))
            if not (os.path.isfile(t) or os.path.isfile(os.path.join(t, "index.html")) or os.path.isfile(t + ".html")):
                bad.append(f"{os.path.relpath(path, root)} -> {url}")

bad = sorted(set(bad))
print(f"check-links: {seen} internal links checked, {len(bad)} broken")
for b in bad:
    print(f"  {b}")
sys.exit(1 if bad else 0)
