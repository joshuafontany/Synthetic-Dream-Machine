#!/usr/bin/env bash
# Top-level flow runner for isolated integration ceremonies.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

FLOW="${1:-all}"
export LAR_ROOT="${LAR_ROOT:-$REPO_ROOT/tests}"

case "$FLOW" in
  all|tw5)
    pnpm test:tw5-fixture
    # tw5-sync, tw5-decompose, tw5-promote flow scripts retired 2026-05-31 under
    # the residency-model cleanup. Residency-action flow scripts (Sprint 5+)
    # will land under tests/lararium-tw5/residency/.
    ;;
  tw5-fixture)
    pnpm test:tw5-fixture
    ;;
  clean)
    bash tests/bin/cleanup-lar-root.sh
    ;;
  *)
    cat >&2 <<USAGE
Unknown flow: $FLOW

Usage:
  tests/bin/run-flow.sh all          # alias for tw5-fixture
  tests/bin/run-flow.sh tw5-fixture
  tests/bin/run-flow.sh clean
USAGE
    exit 2
    ;;
esac
