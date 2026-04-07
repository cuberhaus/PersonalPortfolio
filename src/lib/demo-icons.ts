/**
 * Single source of truth for demo icon SVG inner content.
 * Keys must match the `icon` field in demos.json.
 */
export const ICON_PATHS: Record<string, string> = {
  gamepad:    '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4M8 10v4M15 11h.01M18 13h.01"/>',
  tree:       '<path d="M12 3v18M12 7l-4-4M12 7l4-4M12 13l-6-2M12 13l6-2M12 19l-8-3M12 19l8-3"/>',
  music:      '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  store:      '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  heart:      '<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>',
  camera:     '<path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>',
  graph:      '<circle cx="5" cy="6" r="2.5"/><circle cx="19" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><line x1="7" y1="7" x2="17" y2="7"/><line x1="6" y1="8" x2="11" y2="16"/><line x1="18" y1="8" x2="13" y2="16"/><line x1="7" y1="18" x2="10" y2="18"/>',
  scatter:    '<line x1="3" y1="21" x2="21" y2="21"/><line x1="3" y1="3" x2="3" y2="21"/><circle cx="7" cy="16" r="1.5" fill="currentColor"/><circle cx="10" cy="12" r="1.5" fill="currentColor"/><circle cx="14" cy="8" r="1.5" fill="currentColor"/><circle cx="18" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="15" r="1.5" fill="currentColor"/><circle cx="16" cy="11" r="1.5" fill="currentColor"/>',
  map:        '<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1118 0z"/><circle cx="12" cy="10" r="2.5"/>',
  helicopter: '<path d="M4 14h5l2 3h2l2-3h5"/><circle cx="9" cy="14" r="2"/><circle cx="15" cy="14" r="2"/><path d="M12 8v3M9 5l1.5 4M15 5l-1.5 4"/><path d="M2 12h20" opacity="0.5"/>',
  aorta:      '<path d="M12 21V10"/><path d="M8 6c0-2 1.5-3.5 4-3.5s4 1.5 4 3.5v4c0 2-1.5 3.5-4 3.5s-4-1.5-4-3.5V6z"/><path d="M6 14h12" opacity="0.4"/><circle cx="12" cy="17" r="1.5" fill="currentColor" stroke="none"/>',
  ml:         '<rect x="3" y="14" width="4" height="6" rx="0.5"/><rect x="10" y="10" width="4" height="10" rx="0.5"/><rect x="17" y="6" width="4" height="14" rx="0.5"/><path d="M5 8l3 3 4-4 4 3 3-5"/><circle cx="5" cy="7" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="4" r="1.5" fill="currentColor" stroke="none"/>',
  microscope: '<circle cx="12" cy="9" r="3"/><path d="M12 12v4"/><path d="M8 21h8"/><path d="M12 16v5"/><path d="M7 3l2 6"/><path d="M17 3l-2 6"/><circle cx="12" cy="9" r="6" opacity="0.3"/>',
  server:     '<rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>',
  search:     '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
};

export function renderIconSvg(icon: string, size: number): string {
  const inner = ICON_PATHS[icon] ?? '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}
