#!/usr/bin/env bash
# Amazon Ember into public/fonts/amazon-ember/ from the official Amazon Typefaces set
# (the folder or its zip, as AWS hands it to the community).
#
#   scripts/install-fonts.sh <Amazon_Typefaces_Complete_Font_Set folder or .zip>
#   scripts/install-fonts.sh <set> --system     also into ~/Library/Fonts (PowerPoint, browsers)
#
# Amazon's "Amazon Type Library Usage Guidelines" (in the set) need no licence
# payment or attribution. The files are still never committed or published:
# public/fonts/amazon-ember/ is gitignored and left out of the player build.
set -euo pipefail

SRC="${1:-}"
SYSTEM="${2:-}"
if [ -z "$SRC" ] || [ ! -e "$SRC" ]; then
  echo "usage: $0 <Amazon_Typefaces_Complete_Font_Set folder or .zip> [--system]" >&2
  exit 2
fi

HERE="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$HERE/public/fonts/amazon-ember"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if [ -f "$SRC" ]; then
  unzip -o -q "$SRC" -d "$TMP/set"
  SRC="$TMP/set"
fi
# The set nests its own zips; unpack them when the folders are not there yet.
for z in "$SRC"/amazon_typography_webfonts.zip "$SRC"/amazon_typography_all.zip; do
  [ -f "$z" ] && unzip -o -q "$z" -d "$TMP/inner"
done

find_one() { find "$SRC" "$TMP" -name "$1" -type f 2>/dev/null | head -1; }
RG="$(find_one AmazonEmber_W_Rg.woff2)"
BD="$(find_one AmazonEmber_W_Bd.woff2)"
HE="$(find_one AmazonEmber_W_He.woff2)"
MD="$(find_one AmazonEmber-Md.ttf)"
[ -n "$MD" ] || MD="$(find_one Amazon-Ember-Medium.ttf)"
for f in "$RG" "$MD" "$BD" "$HE"; do
  [ -n "$f" ] || { echo "Amazon Ember files not found in the set (need AmazonEmber_W_Rg/Bd/He.woff2 and AmazonEmber-Md.ttf)" >&2; exit 1; }
done

mkdir -p "$OUT"
install -m 644 "$RG" "$OUT/amazon-ember-400.woff2"
install -m 644 "$MD" "$OUT/amazon-ember-500.ttf"
install -m 644 "$BD" "$OUT/amazon-ember-700.woff2"
install -m 644 "$HE" "$OUT/amazon-ember-800.woff2"
echo "Amazon Ember in ${OUT#$HERE/}: 400, 500, 700, 800"

if [ "$SYSTEM" = "--system" ]; then
  mkdir -p "$HOME/Library/Fonts"
  for name in AmazonEmber_Rg.ttf AmazonEmber-Md.ttf AmazonEmber_Bd.ttf AmazonEmber_He.ttf; do
    f="$(find_one "$name")"
    [ -n "$f" ] && install -m 644 "$f" "$HOME/Library/Fonts/$name" && echo "installed $name in ~/Library/Fonts"
  done
fi
