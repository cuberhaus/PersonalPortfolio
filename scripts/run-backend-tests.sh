#!/usr/bin/env bash
# run-backend-tests.sh — run Python/Django backend test suites with graceful
# dependency-skip logic (mirrors the Go/Rust SKIP pattern in the Makefile).
#
# Usage: bash scripts/run-backend-tests.sh <python> <parent-dir>
#   python     — path to the Python interpreter (e.g. /usr/bin/python3)
#   parent-dir — absolute path one level up from this repo (i.e. ../.. of Makefile)
#
# Exit codes:
#   0  — all suites that could run passed (skipped suites are not failures)
#   1  — at least one suite ran and had test failures

set -uo pipefail

PYTHON="${1:-python3}"
PARENT="${2:-..}"
FAIL=0

# ---------------------------------------------------------------------------
# run_pytest <dir> <test-path>
#   Runs pytest in <dir>/<test-path>.
#   If the directory is missing, or deps are absent (ImportError / ModuleNotFoundError),
#   the suite is skipped rather than failing.
# ---------------------------------------------------------------------------
run_pytest() {
    local dir="$1" test_path="$2"
    if [ ! -d "$dir" ]; then
        echo "  SKIP: $dir not found"
        return 0
    fi
    local out
    out=$(cd "$dir" && "$PYTHON" -m pytest "$test_path" -v 2>&1)
    local ec=$?
    printf '%s\n' "$out"
    if [ $ec -ne 0 ] && printf '%s' "$out" | grep -qE "ModuleNotFoundError|No module named|ImportError|error during collection"; then
        echo "  SKIP: missing Python dependencies in $dir — install with: pip install -r requirements.txt"
        return 0
    fi
    return $ec
}

echo "=== Python backends (pytest) ==="
run_pytest "$PARENT/projectA/web"              backend/test_app.py || FAIL=1
run_pytest "$PARENT/desastresIA/web"           backend/test_app.py || FAIL=1
run_pytest "$PARENT/projectA2/web"             backend/test_app.py || FAIL=1
run_pytest "$PARENT/CAIM/web"                  backend/test_app.py || FAIL=1
run_pytest "$PARENT/bitsXlaMarato/web/backend" test_app.py         || FAIL=1
run_pytest "$PARENT/SBC_IA/web"                backend/test_app.py || FAIL=1
run_pytest "$PARENT/TFG/backend"               test_main.py        || FAIL=1
run_pytest "planner-api"                       tests/              || FAIL=1

echo ""
echo "=== Django (Draculin) ==="
DRACU_DIR="$PARENT/Draculin-Backend"
if [ ! -d "$DRACU_DIR" ]; then
    echo "  SKIP: $DRACU_DIR not found"
elif ! "$PYTHON" -c "import django" 2>/dev/null; then
    echo "  SKIP: django not installed — install with: pip install -r $DRACU_DIR/requirements.txt"
else
    (cd "$DRACU_DIR" && "$PYTHON" manage.py test dracu -v2) || FAIL=1
fi

exit $FAIL
