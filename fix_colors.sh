#!/bin/bash
FILES="src/components/demos/*.tsx"

# Replace border colors
sed -i 's/#1e1e2a/var(--border-color)/g' $FILES
sed -i 's/#27272a/var(--border-color)/g' $FILES
sed -i 's/#3f3f46/var(--border-color-hover)/g' $FILES

# Replace text colors
sed -i 's/#e4e4e7/var(--text-primary)/g' $FILES
sed -i 's/#d4d4d8/var(--text-primary)/g' $FILES
sed -i 's/#a1a1aa/var(--text-secondary)/g' $FILES
sed -i 's/#71717a/var(--text-muted)/g' $FILES
sed -i 's/#52525b/var(--text-muted)/g' $FILES

# Replace background colors
sed -i 's/#0c0c14/var(--bg-secondary)/g' $FILES
sed -i 's/#0c0c12/var(--bg-secondary)/g' $FILES
sed -i 's/#0a0a11/var(--bg-secondary)/g' $FILES
sed -i 's/#1c1c28/var(--bg-card-hover)/g' $FILES
sed -i 's/#16161f/var(--bg-card)/g' $FILES
sed -i 's/#12121a/var(--bg-secondary)/g' $FILES
sed -i 's/#0a0a0a/var(--bg-primary)/g' $FILES
