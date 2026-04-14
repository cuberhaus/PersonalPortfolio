#!/usr/bin/env bash
# Count lines of code per language across the workspace, excluding vendor/third-party code.
# Run from anywhere — uses the parent of PersonalPortfolio as the workspace root.
#
# Usage:
#   ./scripts/count-loc.sh          # print summary
#   ./scripts/count-loc.sh --patch  # also update Skills.astro LOC_DATA in-place

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE="${SCRIPT_DIR}/../../"  # parent of PersonalPortfolio
SKILLS_FILE="${SCRIPT_DIR}/../src/components/Skills.astro"

# ── Exclude patterns (vendor / generated / third-party) ──────────────────────
GLOBAL_EXCLUDES=(
  -not -path '*/.git/*'
  -not -path '*/node_modules/*'
  -not -path '*/dist/*'
  -not -path '*/build/*'
  -not -path '*/.venv/*'
  -not -path '*/venv/*'
  -not -path '*/.obsidian*'
  -not -path '*/.angular/*'
  -not -path '*/javadoc/*'
)

count() {
  local ext="$1"; shift
  # Remaining args are extra exclude patterns
  find "$WORKSPACE" -name "*.${ext}" "${GLOBAL_EXCLUDES[@]}" "$@" -print0 2>/dev/null \
    | xargs -0 cat 2>/dev/null | wc -l
}

# ── Per-language counts (with vendor exclusions) ──────────────────────────────
# Run all counts in parallel via temp files
TMPDIR_LOC=$(mktemp -d)
trap 'rm -rf "$TMPDIR_LOC"' EXIT

count_to() { local out="$1"; shift; count "$@" > "$out"; }

count_to "$TMPDIR_LOC/python"     py   -not -path '*/fast-downward/*' &
count_to "$TMPDIR_LOC/c"          c    -not -path '*/rvctools/*' -not -path '*/picosat*' \
                                        -not -path '*Metric-FF*' -not -path '*metric-ff*' &
count_to "$TMPDIR_LOC/cpp"        cpp  &
count_to "$TMPDIR_LOC/java"       java -not -path '*/aima/*' &
count_to "$TMPDIR_LOC/sql"        sql  &
count_to "$TMPDIR_LOC/haskell"    hs   &
count_to "$TMPDIR_LOC/prolog"     pl   -not -path '*/LanguageTool*' -not -path '*/texstudio/*' &
count_to "$TMPDIR_LOC/js"         js   -not -path '*/.obsidian*' -not -path '*/.angular/*' -not -path '*/javadoc/*' &
count_to "$TMPDIR_LOC/ts"         ts   &
count_to "$TMPDIR_LOC/tsx"        tsx   &
count_to "$TMPDIR_LOC/powershell" ps1  &
wait

declare -A LINES
LINES[Python]=$(<"$TMPDIR_LOC/python")
LINES[C]=$(<"$TMPDIR_LOC/c")
LINES[C++]=$(<"$TMPDIR_LOC/cpp")
LINES[Java]=$(<"$TMPDIR_LOC/java")
LINES[SQL]=$(<"$TMPDIR_LOC/sql")
LINES[Haskell]=$(<"$TMPDIR_LOC/haskell")
LINES[Prolog]=$(<"$TMPDIR_LOC/prolog")
js=$(<"$TMPDIR_LOC/js"); ts=$(<"$TMPDIR_LOC/ts"); tsx=$(<"$TMPDIR_LOC/tsx")
LINES[JavaScript]=$(( js + ts + tsx ))
LINES[PowerShell]=$(<"$TMPDIR_LOC/powershell")

# ── Compute totals & format ───────────────────────────────────────────────────
TOTAL=0
for lang in "${!LINES[@]}"; do
  TOTAL=$(( TOTAL + LINES[$lang] ))
done

format_lines() {
  local n=$1
  if (( n >= 1000 )); then
    # Round to nearest K with one decimal, drop trailing .0
    local k=$(awk "BEGIN{printf \"%.1f\", $n/1000}")
    k="${k%.0}"
    echo "~${k}K"
  else
    echo "~${n}"
  fi
}

# Sort by line count descending
ORDERED=($(for lang in "${!LINES[@]}"; do echo "${LINES[$lang]} $lang"; done | sort -rn | awk '{print $2}'))

echo "Language          Lines     %"
echo "────────────────────────────────"
for lang in "${ORDERED[@]}"; do
  n=${LINES[$lang]}
  pct=$(( n * 100 / TOTAL ))
  printf "%-17s %6s   %3d%%\n" "$lang" "$(format_lines "$n")" "$pct"
done
echo "────────────────────────────────"
printf "%-17s %6s   100%%\n" "Total" "$(format_lines "$TOTAL")"

# ── Optionally patch Skills.astro ─────────────────────────────────────────────
if [[ "${1:-}" == "--patch" ]]; then
  if [[ ! -f "$SKILLS_FILE" ]]; then
    echo "ERROR: Skills.astro not found at $SKILLS_FILE" >&2
    exit 1
  fi

  # Build the replacement block
  BLOCK="const LOC_DATA: Record<string, { lines: string; pct: number }> = {"
  # Fixed order matching skills.json
  for lang in Python C "C++" Java SQL Haskell Prolog JavaScript PowerShell; do
    n=${LINES[$lang]}
    pct=$(( n * 100 / TOTAL ))
    (( pct == 0 && n > 0 )) && pct=1
    fl=$(format_lines "$n")
    key="$lang"
    [[ "$lang" == "C++" ]] && key="'C++'"
    BLOCK+=$'\n'"  ${key}:$(printf '%*s' $((12 - ${#key})) ''){ lines: '${fl}', pct: ${pct} },"
  done
  BLOCK+=$'\n'"};"

  # Replace the LOC_DATA block in Skills.astro using sed
  # Match from "const LOC_DATA" to the closing "};"
  tmpfile=$(mktemp)
  awk '
    /^const LOC_DATA:/ { skip=1 }
    skip && /^};/ { skip=0; next }
    !skip
  ' "$SKILLS_FILE" > "$tmpfile"

  # Insert new block before the "---" closing fence (second occurrence)
  awk -v block="$BLOCK" '
    BEGIN { count=0 }
    /^---$/ {
      count++
      if (count == 2) {
        print block
      }
    }
    { print }
  ' "$tmpfile" > "$SKILLS_FILE"
  rm "$tmpfile"

  echo ""
  echo "✓ Patched Skills.astro LOC_DATA"
fi
