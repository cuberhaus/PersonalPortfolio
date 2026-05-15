#!/usr/bin/env node
// Aborts commits made directly on protected branches.
// Wired up via lefthook.yml (commit-msg hook).
import { execSync } from 'node:child_process';

const PROTECTED = new Set(['main', 'master']);
const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();

if (PROTECTED.has(branch)) {
  console.error('');
  console.error(`  ✗ Direct commits to '${branch}' are blocked — it is protected on GitHub.`);
  console.error('');
  console.error('  Move this commit to a feature branch:');
  console.error('');
  console.error('    git reset --soft HEAD~1   # only if a commit already landed');
  console.error('    git checkout -b <branch>  # cut a feature branch');
  console.error('    git commit                # re-commit on the new branch');
  console.error('');
  process.exit(1);
}
