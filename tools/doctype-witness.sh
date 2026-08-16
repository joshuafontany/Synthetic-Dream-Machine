#!/usr/bin/env bash
# doctype-witness — every carrier opens by naming the grammar that reads it, at the one address that does.
set -uo pipefail
cd "$(dirname "$0")/.."
REPO="$PWD" node tools/doctype.mjs
