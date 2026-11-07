#!/usr/bin/env bash
# Prepare a built Jekyll site for Cloudflare Pages: pages-stage.sh <built _site> <staging dir>
#
# Used by both deployers, so they publish exactly the same thing:
#   - CI: .github/workflows/pages.yml (push to prod)
#   - the home server's watcher: ~/projects/.setup/cf-pages/deploy-blog.sh
#
# 1. Refuses a site that looks broken (missing index/404/feed, too few files).
# 2. Copies it without the files the old nginx origin refused to serve: dotfiles (except
#    /.well-known/), symlinks and source/ops file types. Pages serves every file it is given.
# 3. Writes _headers (security headers, webmanifest type, noindex on *.pages.dev).
# Prints the left-out paths to stderr. Exit 1 on a broken build.
set -euo pipefail

SRC=${1:?usage: pages-stage.sh <site dir> <stage dir>}
STAGE=${2:?usage: pages-stage.sh <site dir> <stage dir>}
MIN_FILES=${MIN_FILES:-30}
# Keep in sync with the deny location in .bundle/nginx.blog.conf on the home server.
DENY_EXT='map|md|markdown|yml|yaml|lock|gemspec|scss|sass|bak|swp|log|env|conf|ini|toml|sh|rb|py'

for f in index.html 404.html feed.xml; do
  [ -s "$SRC/$f" ] || { echo "pages-stage: $SRC/$f missing or empty (broken or unfinished build)" >&2; exit 1; }
done
count=$(find "$SRC" -type f | wc -l)
[ "$count" -ge "$MIN_FILES" ] || { echo "pages-stage: only $count files in $SRC (< $MIN_FILES)" >&2; exit 1; }

skipped=$(cd "$SRC" && find . -mindepth 1 \( -type l -o \( -name '.*' -not -path './.well-known*' \) \
          -o -regextype posix-extended -iregex ".*\.($DENY_EXT)$" \) -print | sort)
[ -z "$skipped" ] || echo "pages-stage: left out (deny-list): $(echo "$skipped" | tr '\n' ' ')" >&2

mkdir -p "$STAGE"
# First matching rule wins: keep /.well-known/, then drop dotfiles and deny-listed types.
# _headers is protected from --delete; it is rewritten below.
# shellcheck disable=SC2046
rsync -a --delete --no-links --filter='P /_headers' --include='/.well-known/***' --exclude='.*' \
      $(printf -- "--exclude=*.%s " ${DENY_EXT//|/ }) \
      "$SRC"/ "$STAGE"/

cat >"$STAGE/_headers" <<'HDR'
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin

https://:project.pages.dev/*
  X-Robots-Tag: noindex

https://:version.:project.pages.dev/*
  X-Robots-Tag: noindex

/assets/favicon/site.webmanifest
  Content-Type: application/manifest+json
HDR

echo "pages-stage: staged $count files into $STAGE"
