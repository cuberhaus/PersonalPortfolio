/**
 * Source guard for issue #280: no emoji-capable symbol may be left to the browser's font fallback.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';

const REPO = join(__dirname, '..', '..');
const posix = (path: string) => path.split(sep).join('/');

/**
 * Where the copy we author lives. Tests are skipped: they have to talk about the symbols. Static
 * files under public/ are not scanned; they are served as they are and carry no instance of this.
 */
const SCAN_ROOTS: { dir: string; extensions: RegExp }[] = [
  { dir: 'src', extensions: /\.(astro|tsx?|mts|mjs|css|json)$/ },
  { dir: 'locales', extensions: /\.json$/ },
];

function walk(dir: string, extensions: RegExp): string[] {
  const absolute = join(REPO, dir);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : walk(join(dir, entry.name), extensions);
    }
    return extensions.test(entry.name) ? [posix(join(dir, entry.name))] : [];
  });
}

function uiSourceFiles(): string[] {
  return SCAN_ROOTS.flatMap(({ dir, extensions }) => walk(dir, extensions));
}

const GUIDANCE =
  'iOS draws these symbols as colour emoji tiles because the web fonts we load do not contain ' +
  'them (issue #280). For a link arrow render <ExternalArrow />; for a symbol inside text append ' +
  'U+FE0E (write it as \\ufe0e in JSON and \\FE0E in CSS) to ask for the text form.';

interface Finding {
  line: number;
  codePoint: string;
  text: string;
}

const TEXT_DEFAULT_EMOJI =
  /(?![0-9#*])(?=\p{Emoji})(?!\p{Emoji_Presentation}).(?![\uFE0E\uFE0F])/gu;

/**
 * Text-default emoji the web fonts do contain: the Latin slices of Inter and JetBrains Mono carry
 * the copyright, registered and trade mark signs, so the browser never reaches an emoji font.
 */
const COVERED_BY_WEB_FONTS = new Set(['\u00A9', '\u00AE', '\u2122']);

/** Named entities for the text-default emoji arrows; numeric entities need no table. */
const NAMED_ENTITIES: Record<string, string> = {
  nearr: '\u2197',
  nwarr: '\u2196',
  searr: '\u2198',
  swarr: '\u2199',
  harr: '\u2194',
  varr: '\u2195',
};

/** Turns the ways source text can spell a character (entities, escapes) into the character. */
function decodeEscapes(text: string): string {
  const decode = (whole: string, digits: string, radix: number) => {
    const codePoint = parseInt(digits, radix);
    return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : whole;
  };
  return text
    .replace(/&#(\d+);/g, (whole, digits: string) => decode(whole, digits, 10))
    .replace(/&#x([0-9a-f]+);/gi, (whole, digits: string) => decode(whole, digits, 16))
    .replace(/&([a-z]+);/g, (whole, name: string) => NAMED_ENTITIES[name] ?? whole)
    .replace(/\\u\{([0-9a-f]+)\}/gi, (whole, digits: string) => decode(whole, digits, 16))
    .replace(/\\u([0-9a-f]{4})/gi, (whole, digits: string) => decode(whole, digits, 16))
    .replace(/\\([0-9a-f]{1,6})\s?/gi, (whole, digits: string) => decode(whole, digits, 16));
}

function findBareTextEmoji(source: string): Finding[] {
  return source.split('\n').flatMap((text, index) =>
    [...decodeEscapes(text).matchAll(TEXT_DEFAULT_EMOJI)]
      .filter((match) => !COVERED_BY_WEB_FONTS.has(match[0]))
      .map((match) => ({
        line: index + 1,
        codePoint: `U+${match[0].codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`,
        text: text.trim(),
      }))
  );
}

describe('findBareTextEmoji', () => {
  it('flags an emoji-capable arrow written as a plain character', () => {
    expect(findBareTextEmoji('View credential ↗')).toMatchObject([
      { line: 1, codePoint: 'U+2197' },
    ]);
  });

  it('accepts the same symbol once a selector says which presentation is meant', () => {
    expect(findBareTextEmoji('View credential ↗\uFE0E')).toEqual([]); // text
    expect(findBareTextEmoji('Settings ⚙\uFE0F')).toEqual([]); // emoji, deliberately
  });

  it('ignores symbols that cannot be turned into an emoji by font fallback', () => {
    // Plain arrows, emoji that are always colour, and the ASCII keycap bases.
    expect(findBareTextEmoji('Back ← next → up ↑ down ↓ 🎬 ✅ 1 # *')).toEqual([]);
  });

  it('accepts the text-default emoji that the web fonts themselves contain', () => {
    // The Latin slices of Inter and JetBrains Mono carry the copyright, registered and trade mark
    // signs, so the browser never reaches an emoji font for them and they need no selector.
    expect(findBareTextEmoji('© 2026 Acme® Cloud™')).toEqual([]);
    expect(findBareTextEmoji('&#169; &#174; &#x2122;')).toEqual([]);
    expect(findBareTextEmoji("content: '\\A9 \\AE \\2122';")).toEqual([]);
  });

  it('does not mistake ordinary backslash sequences for symbols', () => {
    // Regex escapes and Windows-style paths look like CSS hex escapes but never spell an emoji.
    expect(
      findBareTextEmoji('const word = /\\bword\\d+\\b/; const path = "C:\\\\temp\\\\data";')
    ).toEqual([]);
  });

  it.each([
    ['a decimal entity', 'Open in new tab &#8599;'],
    ['a hex entity', 'Open in new tab &#x2197;'],
    ['a named entity', 'Open in new tab &nearr;'],
    ['a JavaScript escape', "const label = 'Open \\u2197';"],
    ['a JavaScript code point escape', "const label = 'Open \\u{2197}';"],
    ['a JSON escape', '"openTab": "Open \\u2197"'],
    ['a CSS escape', "content: '\\2197 ';"],
  ])('flags the symbol when it is written as %s', (_form, source) => {
    expect(findBareTextEmoji(source)).toMatchObject([{ line: 1, codePoint: 'U+2197' }]);
  });

  it('honours a selector that is itself written as an escape', () => {
    expect(findBareTextEmoji('Open &#8599;&#xFE0E;')).toEqual([]);
    expect(findBareTextEmoji('"devpostLabel": "Devpost \\u2197\\ufe0e"')).toEqual([]);
    expect(findBareTextEmoji("content: '\\25B6\\FE0E\\20 ';")).toEqual([]);
  });

  it('reports the line the symbol is on', () => {
    expect(findBareTextEmoji('first\nsecond\nthird ↔ line')).toMatchObject([
      { line: 3, codePoint: 'U+2194', text: 'third ↔ line' },
    ]);
  });
});

describe('first-party UI sources', () => {
  const files = uiSourceFiles();

  it('actually cover the files that ship copy to visitors', () => {
    expect(files).toEqual(
      expect.arrayContaining([
        'src/components/Certifications.astro',
        'src/components/demos/LiveAppEmbed.tsx',
        'src/styles/designs.css',
        'locales/en/ui.json',
      ])
    );
    expect(files.some((file) => file.includes('__tests__'))).toBe(false);
  });

  it('leave no emoji-capable symbol to the browser font fallback', () => {
    const offenders = files.flatMap((file) =>
      findBareTextEmoji(readFileSync(join(REPO, file), 'utf-8')).map(
        (finding) => `${file}:${finding.line}  ${finding.codePoint}  ${finding.text}`
      )
    );
    expect(offenders, GUIDANCE).toEqual([]);
  });
});
