export interface DesignMeta {
  id: string;
  label: string;
  /** Short one-line description for the Ctrl+K modal preview tile. */
  blurb: string;
  /** Representative preview hints rendered in the modal swatch (pure CSS). */
  preview: {
    /** Font family sample rendered in the tile. */
    font: string;
    /** Corner radius sample: e.g. '0', '0.75rem', '1.5rem'. */
    radius: string;
    /** Pictorial style keyword used to pick the tile's mini-mockup. */
    style:
      | 'gradient' | 'serif' | 'blur' | 'grid' | 'soft' | 'pixel'
      | 'terminal' | 'neon' | 'clay'
      | 'paper' | 'raw' | 'schematic';
  };
}

export const DESIGNS: DesignMeta[] = [
  {
    id: 'minimal',
    label: 'Minimal',
    blurb: 'Clean modern portfolio with gradient accents',
    preview: { font: 'Inter, system-ui, sans-serif', radius: '0.75rem', style: 'gradient' },
  },
  {
    id: 'editorial',
    label: 'Editorial',
    blurb: 'Serif headlines, drop caps, magazine columns',
    preview: { font: '"Playfair Display", Georgia, serif', radius: '0', style: 'serif' },
  },
  {
    id: 'glass',
    label: 'Glass',
    blurb: 'Translucent cards, aurora blur, soft shadows',
    preview: { font: 'Inter, system-ui, sans-serif', radius: '1.5rem', style: 'blur' },
  },
  {
    id: 'swiss',
    label: 'Swiss',
    blurb: 'Strict grid, giant numerals, hairline rules',
    preview: { font: '"Inter Tight", Helvetica, Arial, sans-serif', radius: '0', style: 'grid' },
  },
  {
    id: 'neumorphic',
    label: 'Neumorphic',
    blurb: 'Soft pillowy UI with inset / outset shadows',
    preview: { font: 'Inter, system-ui, sans-serif', radius: '1.5rem', style: 'soft' },
  },
  {
    id: 'pixel',
    label: 'Pixel',
    blurb: '8-bit pixel font, chunky buttons, hard shadows',
    preview: { font: '"Press Start 2P", ui-monospace, monospace', radius: '0', style: 'pixel' },
  },
  {
    id: 'terminal',
    label: 'Terminal',
    blurb: 'CRT vibes, monospace everywhere, blinking cursor',
    preview: { font: '"JetBrains Mono", ui-monospace, monospace', radius: '0', style: 'terminal' },
  },
  {
    id: 'cyber',
    label: 'Cyberpunk',
    blurb: 'Neon glow, chromatic aberration, synthwave grid',
    preview: { font: 'Orbitron, "Inter Tight", sans-serif', radius: '0', style: 'neon' },
  },
  {
    id: 'clay',
    label: 'Claymorphism',
    blurb: 'Chunky 3D pillows with soft pastel shadows',
    preview: { font: 'Inter, system-ui, sans-serif', radius: '1.75rem', style: 'clay' },
  },
  {
    id: 'notebook',
    label: 'Notebook',
    blurb: 'Graph paper, handwritten ink, highlighter marks',
    preview: { font: 'Caveat, "Comic Sans MS", cursive', radius: '0.5rem', style: 'paper' },
  },
  {
    id: 'brutalist',
    label: 'Brutalist',
    blurb: 'Raw HTML energy: Times, yellow tape, thick borders',
    preview: { font: '"Times New Roman", Times, serif', radius: '0', style: 'raw' },
  },
  {
    id: 'blueprint',
    label: 'Blueprint',
    blurb: 'Cyan grid, hairlines, dimension marks, tech labels',
    preview: { font: '"JetBrains Mono", ui-monospace, monospace', radius: '0', style: 'schematic' },
  },
];

export const DESIGN_IDS = DESIGNS.map(d => d.id);
export const DEFAULT_DESIGN = 'minimal';
