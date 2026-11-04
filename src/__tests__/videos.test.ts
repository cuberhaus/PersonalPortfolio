/**
 * Videos section contracts that a schema cannot express: the media files exist and are small
 * enough to stream, the credit the licence demands is on the page, and nothing downloads before
 * a visitor presses play.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, openSync, readSync, closeSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import videosData from '../data/videos.json';
import { listDemos } from '../i18n/demo';

const ROOT = join(__dirname, '..', '..');
const PUBLIC_DIR = join(ROOT, 'public');
const COMPONENT = readFileSync(join(ROOT, 'src', 'components', 'Videos.astro'), 'utf-8');

const MB = 1024 * 1024;
const KB = 1024;

const demoSlugs = new Set(listDemos('en', { includeHidden: true }).map((d) => d.slug));

/** Returns the byte offsets of the `moov` and `mdat` boxes in the first 64 KB of an MP4. */
function topLevelBoxOffsets(file: string): { moov: number; mdat: number } {
  const fd = openSync(file, 'r');
  try {
    const head = Buffer.alloc(64 * KB);
    readSync(fd, head, 0, head.length, 0);
    return { moov: head.indexOf('moov'), mdat: head.indexOf('mdat') };
  } finally {
    closeSync(fd);
  }
}

describe('Video files', () => {
  for (const entry of videosData) {
    describe(entry.title, () => {
      it('has its video, poster and thumbnail on disk', () => {
        for (const asset of [entry.video, entry.poster, entry.thumb]) {
          expect(existsSync(join(PUBLIC_DIR, asset)), `${asset} is missing`).toBe(true);
        }
      });

      it('keeps every file within its size budget', () => {
        expect(statSync(join(PUBLIC_DIR, entry.video)).size).toBeLessThan(8 * MB);
        expect(statSync(join(PUBLIC_DIR, entry.poster)).size).toBeLessThan(200 * KB);
        expect(statSync(join(PUBLIC_DIR, entry.thumb)).size).toBeLessThan(60 * KB);
      });

      it('has its index at the front so playback starts before the download ends', () => {
        const { moov, mdat } = topLevelBoxOffsets(join(PUBLIC_DIR, entry.video));
        expect(
          moov,
          'no moov box in the first 64 KB: re-encode with -movflags +faststart'
        ).toBeGreaterThan(0);
        expect(moov).toBeLessThan(mdat);
      });

      it('links to a demo page that exists', () => {
        if ('demo' in entry && entry.demo) {
          expect(demoSlugs, `no demo "${entry.demo}" in demos.json`).toContain(entry.demo);
        }
      });

      it('offers somewhere to go next', () => {
        const hasDemo = 'demo' in entry && Boolean(entry.demo);
        const hasSource = 'github' in entry && Boolean(entry.github);
        expect(hasDemo || hasSource).toBe(true);
      });
    });
  }

  it('uses a unique file name per video', () => {
    const files = videosData.map((entry) => entry.video);
    expect(new Set(files).size).toBe(files.length);
  });
});

describe('Videos.astro', () => {
  it('requests nothing until the visitor presses play', () => {
    expect(COMPONENT).toMatch(/<video[^>]*\bpreload="none"/);
  });

  it('prints the music credit, its source and its licence beside every video', () => {
    expect(COMPONENT).toContain('entry.music.artist');
    expect(COMPONENT).toContain('entry.music.title');
    expect(COMPONENT).toContain('entry.music.artistUrl');
    expect(COMPONENT).toContain('entry.music.license');
    expect(COMPONENT).toContain('entry.music.licenseUrl');
  });

  it('describes each video in text, for people who cannot watch it', () => {
    expect(COMPONENT).toMatch(/aria-describedby=\{`video-description-/);
  });

  it('resolves media paths against BASE_URL', () => {
    expect(COMPONENT).toContain("import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL");
    expect(COMPONENT).toMatch(/`\$\{base\}\$\{entry\.video\}`/);
  });

  it('marks links that leave the portfolio for a demo page with data-astro-reload', () => {
    expect(COMPONENT).toMatch(/video-link-primary"[^>]*data-astro-reload/);
  });

  it('never hardcodes a colour', () => {
    const styles = COMPONENT.slice(COMPONENT.indexOf('<style>'), COMPONENT.indexOf('</style>'));
    expect(styles).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(styles).not.toMatch(/\brgba?\(/);
  });
});
