#!/bin/bash
FILES="src/pages/demos/*.astro"

# Replace text colors
sed -i 's/color: #e4e4e7;/color: var(--text-primary);/g' $FILES
sed -i 's/color: #d4d4d8;/color: var(--text-primary);/g' $FILES
sed -i 's/color: #a1a1aa;/color: var(--text-secondary);/g' $FILES
sed -i 's/color: #71717a;/color: var(--text-muted);/g' $FILES
sed -i 's/color: #52525b;/color: var(--text-muted);/g' $FILES

# Replace background colors
sed -i 's/background-color: #0c0c14;/background-color: var(--bg-secondary);/g' $FILES
sed -i 's/background: #0c0c14;/background: var(--bg-secondary);/g' $FILES
sed -i 's/background: #1c1c28;/background: var(--bg-card-hover);/g' $FILES
sed -i 's/background: #16161f;/background: var(--bg-card);/g' $FILES
sed -i 's/background: #12121a;/background: var(--bg-secondary);/g' $FILES
