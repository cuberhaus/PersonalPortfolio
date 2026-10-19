#!/usr/bin/env node
// Audition helper for the music bed.
//
// The media audio engine searches HeyGen's music library but keeps only the first
// hit (assets/bgm/track.mp3). This script runs the same search with the same
// credential (`npx hyperframes auth login`) and saves the top N results so they can
// be listened to and compared before one is chosen.
//
// Output: assets/bgm/candidates/NN-<name>.<ext> plus candidates.json (names,
// durations, scores, descriptions; no presigned URLs are stored).
//
// Usage:
//   node scripts/audition-music.mjs "upbeat bright electronic, no vocals" [--limit 5]
//
// The engine library path can be overridden with HF_MEDIA_ENGINE_LIB.

import { mkdir, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const args = process.argv.slice(2);
const flagAt = args.indexOf('--limit');
const limit = flagAt >= 0 ? Number(args[flagAt + 1]) || 5 : 5;
const query = args.find((a, i) => !a.startsWith('--') && i !== flagAt + 1);
if (!query) {
  console.error('usage: node scripts/audition-music.mjs "<mood query>" [--limit 5]');
  process.exit(1);
}

const lib =
  process.env.HF_MEDIA_ENGINE_LIB ||
  join(homedir(), '.cursor/skills/media-use/audio/scripts/lib/heygen.mjs');
const { downloadTo, heygenAuthHeaders, searchSounds } = await import(pathToFileURL(lib).href);

const slug = (s) =>
  String(s || 'track')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'track';

// The container decides the extension: the engine's own download is named .mp3
// even when the bytes are WAV, so probe instead of trusting the URL.
function extensionFor(path) {
  const probe = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=format_name', '-of', 'default=nw=1:nk=1', path],
    { encoding: 'utf8' },
  );
  const fmt = String(probe.stdout || '').trim();
  if (fmt.includes('wav')) return 'wav';
  if (fmt.includes('mp3')) return 'mp3';
  if (fmt.includes('mp4') || fmt.includes('mov') || fmt.includes('m4a')) return 'm4a';
  if (fmt.includes('ogg')) return 'ogg';
  if (fmt.includes('flac')) return 'flac';
  return 'audio';
}

const outDir = join(root, 'assets', 'bgm', 'candidates');
await mkdir(outDir, { recursive: true });

console.log(`query: ${query}`);
const results = await searchSounds(query, 'music', heygenAuthHeaders(), { limit });
if (!results.length) {
  console.log('no results');
  process.exit(0);
}

const meta = [];
for (const [i, r] of results.entries()) {
  const n = String(i + 1).padStart(2, '0');
  const tmp = join(outDir, `${n}.download`);
  await downloadTo(r.audio_url, tmp);
  const file = `${n}-${slug(r.name)}.${extensionFor(tmp)}`;
  await rename(tmp, join(outDir, file));
  meta.push({
    rank: i + 1,
    file: `assets/bgm/candidates/${file}`,
    name: r.name ?? null,
    duration_s: typeof r.duration === 'number' ? r.duration : null,
    score: typeof r.score === 'number' ? r.score : null,
    description: r.description ?? null,
  });
  console.log(
    `${n}  ${String(r.name ?? '?').padEnd(34)} ${String(r.duration ?? '?').padStart(6)}s  score ${r.score ?? '?'}  ${file}`,
  );
}

await writeFile(join(outDir, 'candidates.json'), JSON.stringify({ query, results: meta }, null, 2));
console.log(`\nsaved ${meta.length} candidate(s) -> ${outDir}`);
