/**
 * Project video contracts that a schema cannot express: the media files exist and are small
 * enough to stream, every video is reachable from its project's page, the credit the licence
 * demands is printed wherever a player is, and nothing downloads before a visitor presses play.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, openSync, readSync, closeSync, readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import videosData from '../data/videos.json';
import { listDemos } from '../i18n/demo';

const ROOT = join(__dirname, '..', '..');
const PUBLIC_DIR = join(ROOT, 'public');
const read = (...parts: string[]) => readFileSync(join(ROOT, ...parts), 'utf-8');

const STAGE = read('src', 'components', 'VideoStage.astro');
const CAPTION = read('src', 'components', 'VideoCaption.astro');
const DEMO_VIDEO = read('src', 'components', 'DemoVideo.astro');
const DIALOGS = read('src', 'components', 'DemoVideoDialogs.astro');
const DEMOS = read('src', 'components', 'Demos.astro');

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

/** The text of a component's <style> block. */
const styleOf = (source: string) =>
  source.slice(source.indexOf('<style>'), source.indexOf('</style>'));

describe('Video files', () => {
  for (const entry of videosData) {
    describe(entry.demo, () => {
      it('has its video and poster on disk', () => {
        for (const asset of [entry.video, entry.poster]) {
          expect(existsSync(join(PUBLIC_DIR, asset)), `${asset} is missing`).toBe(true);
        }
      });

      it('keeps every file within its size budget', () => {
        expect(statSync(join(PUBLIC_DIR, entry.video)).size).toBeLessThan(8 * MB);
        expect(statSync(join(PUBLIC_DIR, entry.poster)).size).toBeLessThan(200 * KB);
      });

      it('has its index at the front so playback starts before the download ends', () => {
        const { moov, mdat } = topLevelBoxOffsets(join(PUBLIC_DIR, entry.video));
        expect(
          moov,
          'no moov box in the first 64 KB: re-encode with -movflags +faststart'
        ).toBeGreaterThan(0);
        expect(moov).toBeLessThan(mdat);
      });

      it('belongs to a demo that exists', () => {
        expect(demoSlugs, `no demo "${entry.demo}" in demos.json`).toContain(entry.demo);
      });

      it('is shown on its demo page, which is where the card links without script', () => {
        const page = read('src', 'pages', 'demos', `${entry.demo}.astro`);
        expect(
          page,
          `${entry.demo}.astro should render <DemoVideo slug="${entry.demo}" />`
        ).toContain(`<DemoVideo slug="${entry.demo}" />`);
      });
    });
  }

  it('has one video per demo', () => {
    const slugs = videosData.map((entry) => entry.demo);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('ships no file that no video refers to', () => {
    const referenced = new Set(
      videosData.flatMap((entry) => [entry.video, entry.poster].map((p) => p.split('/').pop()))
    );
    const onDisk = readdirSync(join(PUBLIC_DIR, 'videos'));
    expect(onDisk.filter((file) => !referenced.has(file))).toEqual([]);
  });
});

describe('VideoStage.astro', () => {
  it('requests nothing until the visitor presses play', () => {
    expect(STAGE).toMatch(/<video[^>]*\bpreload="none"/);
  });

  it('describes the video in text, for people who cannot watch it', () => {
    expect(STAGE).toMatch(/aria-describedby=\{describedBy\}/);
  });

  it('resolves media paths against BASE_URL', () => {
    expect(STAGE).toContain("import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL");
    expect(STAGE).toMatch(/`\$\{base\}\$\{video\.video\}`/);
    expect(STAGE).toMatch(/`\$\{base\}\$\{video\.poster\}`/);
  });
});

describe('VideoCaption.astro', () => {
  it('prints the music credit, its source and its licence', () => {
    for (const field of ['artist', 'title', 'artistUrl', 'license', 'licenseUrl']) {
      expect(CAPTION).toContain(`music.${field}`);
    }
  });
});

describe('Everywhere a player appears', () => {
  it('shows the caption with its music credit beside the player', () => {
    expect(DEMO_VIDEO).toContain('<VideoCaption');
    expect(DIALOGS).toContain('<VideoCaption');
  });

  it('uses the one shared player', () => {
    expect(DEMO_VIDEO).toContain('<VideoStage');
    expect(DIALOGS).toContain('<VideoStage');
  });

  it('never hardcodes a colour', () => {
    for (const [name, source] of Object.entries({ STAGE, CAPTION, DEMO_VIDEO, DIALOGS, DEMOS })) {
      const styles = styleOf(source);
      expect(styles, name).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(styles, name).not.toMatch(/\brgba?\(/);
    }
  });
});

describe('DemoVideo.astro', () => {
  it('is the target of the card link when script is off', () => {
    expect(DEMO_VIDEO).toMatch(/<section[^>]*\bid="video"/);
  });
});

describe('Project card video button', () => {
  it('is a link to the demo page, so it still works without script', () => {
    expect(DEMOS).toMatch(/class="demo-video-button"/);
    expect(DEMOS).toMatch(/\/#video`/);
  });

  it('opens the matching dialog and marks the link as leaving the portfolio', () => {
    expect(DEMOS).toMatch(/data-video-open=\{demo\.slug\}/);
    expect(DEMOS).toMatch(/data-video-open=\{demo\.slug\}[^>]*data-astro-reload/s);
  });

  it('keeps the button outside the aria-hidden preview, where assistive tech can reach it', () => {
    const preview = DEMOS.slice(DEMOS.indexOf('class="demo-preview"'));
    const previewEnd = preview.indexOf('</div>');
    expect(preview.slice(0, previewEnd)).not.toContain('demo-video-button');
  });
});

describe('DemoVideoDialogs.astro', () => {
  it('uses the native dialog for focus trapping, Escape and focus return', () => {
    expect(DIALOGS).toContain('<dialog');
    expect(DIALOGS).toContain('showModal()');
  });

  it('stops the video when the dialog closes, however it was closed', () => {
    expect(DIALOGS).toMatch(/addEventListener\('close'.*?pause\(\)/s);
  });

  it('links on to the live demo and marks that link data-astro-reload', () => {
    expect(DIALOGS).toMatch(/video-dialog-link"[^>]*data-astro-reload/s);
  });
});
