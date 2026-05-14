import type { Locale } from '../config/locales';
import { DEFAULT_LOCALE } from '../config/locales';

export interface DesignMeta {
  id: string;
  /** English label (used as the fallback when a translation is missing). */
  label: string;
  /** Short one-line description for the Ctrl+K modal preview tile (English fallback). */
  blurb: string;
  /**
   * Per-locale translations of `label` / `blurb`. The English entries live at
   * the top level (`label`, `blurb`) so they double as the default-locale
   * value and the fallback for missing translations.
   */
  translations?: Partial<Record<Exclude<Locale, typeof DEFAULT_LOCALE>, { name?: string; blurb?: string }>>;
  /** Representative preview hints rendered in the modal swatch (pure CSS). */
  preview: {
    /** Font family sample rendered in the tile. */
    font: string;
    /** Corner radius sample: e.g. '0', '0.75rem', '1.5rem'. */
    radius: string;
    /** Pictorial style keyword used to pick the tile's mini-mockup. */
    style:
      | 'gradient' | 'serif' | 'grid' | 'pixel'
      | 'terminal' | 'neon'
      | 'paper' | 'raw' | 'schematic'
      | 'tex' | 'editor' | 'riso'
      | 'deco' | 'zen'
      | 'zine' | 'comic' | 'news';
  };
  /**
   * Retired designs: kept registered (so persisted `localStorage.design`
   * and `?design=<id>` URLs keep working) but not rendered in the Ctrl+K
   * picker grid.
   */
  hidden?: boolean;
  /**
   * Palette ids that look especially good with this design. Used purely
   * as a soft visual hint in the Ctrl+K picker (★ badge + subtle ring
   * on matching swatches); never enforced, never auto-swapped. All
   * palettes remain selectable with every design.
   */
  recommendedThemes?: string[];
}

export const DESIGNS: DesignMeta[] = [
  {
    id: 'minimal',
    label: 'Minimal',
    blurb: 'Clean modern portfolio with gradient accents',
    translations: {
      es: { name: 'Minimalista', blurb: 'Portfolio moderno y limpio con acentos degradados' },
      ca: { name: 'Minimalista', blurb: 'Portfoli modern i net amb accents degradats' },
    },
    preview: { font: 'Inter, system-ui, sans-serif', radius: '0.75rem', style: 'gradient' },
    recommendedThemes: ['dark', 'light', 'nord'],
  },
  {
    id: 'editorial',
    label: 'Editorial',
    blurb: 'Serif headlines, drop caps, magazine columns',
    translations: {
      es: { name: 'Editorial', blurb: 'Titulares serif, capitulares y columnas de revista' },
      ca: { name: 'Editorial', blurb: 'Titulars serif, caplletres i columnes de revista' },
    },
    preview: { font: '"Playfair Display", Georgia, serif', radius: '0', style: 'serif' },
    recommendedThemes: ['sepia', 'paper', 'dark'],
  },
  {
    id: 'swiss',
    label: 'Swiss',
    blurb: 'Strict grid, giant numerals, hairline rules',
    translations: {
      es: { name: 'Suizo', blurb: 'Retícula estricta, números enormes, filetes finos' },
      ca: { name: 'Suís', blurb: 'Retícula estricta, números enormes, filets fins' },
    },
    preview: { font: '"Inter Tight", Helvetica, Arial, sans-serif', radius: '0', style: 'grid' },
    recommendedThemes: ['paper', 'light', 'dark'],
  },
  {
    id: 'pixel',
    label: 'Pixel',
    blurb: '8-bit pixel font, chunky buttons, hard shadows',
    translations: {
      es: { name: 'Píxel', blurb: 'Tipografía 8-bit, botones robustos, sombras duras' },
      ca: { name: 'Píxel', blurb: 'Tipografia 8-bit, botons robustos, ombres dures' },
    },
    preview: { font: '"Press Start 2P", ui-monospace, monospace', radius: '0', style: 'pixel' },
    recommendedThemes: ['synthwave', 'phosphor', 'dracula'],
  },
  {
    id: 'terminal',
    label: 'Terminal',
    blurb: 'CRT vibes, monospace everywhere, blinking cursor',
    translations: {
      es: { name: 'Terminal', blurb: 'Aire CRT, monoespaciado, cursor parpadeante' },
      ca: { name: 'Terminal', blurb: 'Aire CRT, monoespaiat arreu, cursor parpellejant' },
    },
    preview: { font: '"JetBrains Mono", ui-monospace, monospace', radius: '0', style: 'terminal' },
    recommendedThemes: ['phosphor', 'amber-crt', 'gruvbox-dark'],
  },
  {
    id: 'cyber',
    label: 'Cyberpunk',
    blurb: 'Neon glow, chromatic aberration, synthwave grid',
    translations: {
      es: { name: 'Cyberpunk', blurb: 'Brillo neón, aberración cromática, rejilla synthwave' },
      ca: { name: 'Cyberpunk', blurb: 'Brillantor neó, aberració cromàtica, graella synthwave' },
    },
    preview: { font: 'Orbitron, "Inter Tight", sans-serif', radius: '0', style: 'neon' },
    recommendedThemes: ['synthwave', 'tokyo-night', 'dracula'],
  },
  {
    id: 'notebook',
    label: 'Notebook',
    blurb: 'Graph paper, handwritten ink, highlighter marks',
    translations: {
      es: { name: 'Libreta', blurb: 'Papel cuadriculado, tinta manuscrita, marcas de fluorescente' },
      ca: { name: 'Llibreta', blurb: 'Paper quadriculat, tinta manuscrita, marques de fluorescent' },
    },
    preview: { font: 'Caveat, "Comic Sans MS", cursive', radius: '0.5rem', style: 'paper' },
    recommendedThemes: ['paper', 'solarized-light', 'sepia'],
  },
  {
    id: 'brutalist',
    label: 'Brutalist',
    blurb: 'Raw HTML energy: Times, yellow tape, thick borders',
    translations: {
      es: { name: 'Brutalista', blurb: 'Energía HTML cruda: Times, cinta amarilla, bordes gruesos' },
      ca: { name: 'Brutalista', blurb: 'Energia HTML crua: Times, cinta groga, vores gruixudes' },
    },
    preview: { font: '"Times New Roman", Times, serif', radius: '0', style: 'raw' },
    recommendedThemes: ['paper', 'light', 'gruvbox-dark'],
  },
  {
    id: 'blueprint',
    label: 'Blueprint',
    blurb: 'Cyan grid, hairlines, dimension marks, tech labels',
    translations: {
      es: { name: 'Plano técnico', blurb: 'Cuadrícula cian, líneas finas, marcas de cota y etiquetas' },
      ca: { name: 'Plànol tècnic', blurb: 'Quadrícula cian, línies fines, marques de cota i etiquetes' },
    },
    preview: { font: '"JetBrains Mono", ui-monospace, monospace', radius: '0', style: 'schematic' },
    recommendedThemes: ['nord', 'tokyo-night', 'dark'],
  },
  {
    id: 'academic',
    label: 'Academic',
    blurb: 'LaTeX paper: Garamond, numbered sections, abstracts',
    translations: {
      es: { name: 'Académico', blurb: 'Paper LaTeX: Garamond, secciones numeradas, resumen' },
      ca: { name: 'Acadèmic', blurb: 'Paper LaTeX: Garamond, seccions numerades, resum' },
    },
    preview: { font: '"EB Garamond", "Crimson Pro", Georgia, serif', radius: '0', style: 'tex' },
    recommendedThemes: ['sepia', 'paper', 'solarized-light'],
  },
  {
    id: 'ide',
    label: 'IDE',
    blurb: 'VSCode vibes: tab cards, gutter, syntax-coloured hero',
    translations: {
      es: { name: 'IDE', blurb: 'Vibes VSCode: pestañas, gutter, héroe con sintaxis' },
      ca: { name: 'IDE', blurb: 'Vibes VSCode: pestanyes, gutter, heroi amb sintaxi' },
    },
    preview: { font: '"JetBrains Mono", ui-monospace, monospace', radius: '0.25rem', style: 'editor' },
    recommendedThemes: ['dark', 'gruvbox-dark', 'tokyo-night'],
  },
  {
    id: 'risograph',
    label: 'Risograph',
    blurb: 'Duotone print, halftone dots, grain and misregister',
    translations: {
      es: { name: 'Risograph', blurb: 'Impresión dúo-tono, trama de puntos, grano y desregistro' },
      ca: { name: 'Risograph', blurb: 'Impressió duotò, trama de punts, gra i desregistre' },
    },
    preview: { font: 'Inter, system-ui, sans-serif', radius: '0.25rem', style: 'riso' },
    recommendedThemes: ['synthwave', 'sepia', 'gruvbox-dark'],
  },
  {
    id: 'deco',
    label: 'Art Deco',
    blurb: 'Sunbursts, gold gradients, stepped pyramid borders',
    translations: {
      es: { name: 'Art Déco', blurb: 'Soles radiantes, degradados dorados, bordes escalonados' },
      ca: { name: 'Art Déco', blurb: 'Sols radiants, degradats daurats, vores esglaonades' },
    },
    preview: { font: '"Poiret One", "Playfair Display", serif', radius: '0', style: 'deco' },
    recommendedThemes: ['dark', 'sepia', 'dracula'],
  },
  {
    id: 'wabisabi',
    label: 'Wabi-sabi',
    blurb: 'Serene Japanese minimalism, vast negative space',
    translations: {
      es: { name: 'Wabi-sabi', blurb: 'Minimalismo japonés sereno, gran espacio en blanco' },
      ca: { name: 'Wabi-sabi', blurb: 'Minimalisme japonès serè, gran espai en blanc' },
    },
    preview: { font: '"Shippori Mincho", "Noto Serif JP", serif', radius: '0', style: 'zen' },
    recommendedThemes: ['paper', 'sepia', 'nord-light'],
  },
  {
    id: 'zine',
    label: 'Zine',
    blurb: 'Photocopied ransom-note collage, staples and tape',
    translations: {
      es: { name: 'Fanzine', blurb: 'Collage fotocopiado estilo recorte, grapas y cinta' },
      ca: { name: 'Fanzine', blurb: 'Collage fotocopiat estil retall, grapes i cinta' },
    },
    preview: { font: '"Times New Roman", Times, serif', radius: '0', style: 'zine' },
    recommendedThemes: ['gruvbox-dark', 'synthwave', 'paper'],
  },
  {
    id: 'comic',
    label: 'Comic',
    blurb: 'Bangers titles, Ben-Day dots, speech bubbles',
    translations: {
      es: { name: 'Cómic', blurb: 'Títulos Bangers, puntos Ben-Day, bocadillos' },
      ca: { name: 'Còmic', blurb: 'Títols Bangers, punts Ben-Day, bafarades' },
    },
    preview: { font: 'Bangers, "Inter Tight", sans-serif', radius: '0.5rem', style: 'comic' },
    recommendedThemes: ['synthwave', 'light', 'dracula'],
  },
  {
    id: 'newspaper',
    label: 'Newspaper',
    blurb: 'Blackletter masthead, columns, classified ads',
    translations: {
      es: { name: 'Periódico', blurb: 'Cabecera gótica, columnas, anuncios clasificados' },
      ca: { name: 'Diari', blurb: 'Capçalera gòtica, columnes, anuncis classificats' },
    },
    preview: { font: '"EB Garamond", Georgia, serif', radius: '0', style: 'news' },
    recommendedThemes: ['sepia', 'solarized-light', 'paper'],
  },
];

export const DESIGN_IDS = DESIGNS.map(d => d.id);
// The first entry doubles as the default design. Reordering DESIGNS picks a
// new default automatically, with no separate constant to keep in sync.
export const DEFAULT_DESIGN = DESIGNS[0].id;

const designsById = new Map(DESIGNS.map(d => [d.id, d]));

/**
 * Localized name for a design id, falling back to the English `label` when no
 * translation is registered. Returns `null` for unknown ids.
 */
export function getDesignName(id: string, lang: Locale): string | null {
  const d = designsById.get(id);
  if (!d) return null;
  if (lang === DEFAULT_LOCALE) return d.label;
  return d.translations?.[lang as Exclude<Locale, typeof DEFAULT_LOCALE>]?.name ?? d.label;
}

/**
 * Localized blurb for a design id, falling back to the English `blurb` when
 * no translation is registered. Returns `null` for unknown ids.
 */
export function getDesignBlurb(id: string, lang: Locale): string | null {
  const d = designsById.get(id);
  if (!d) return null;
  if (lang === DEFAULT_LOCALE) return d.blurb;
  return d.translations?.[lang as Exclude<Locale, typeof DEFAULT_LOCALE>]?.blurb ?? d.blurb;
}
