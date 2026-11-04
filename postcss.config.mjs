import hoverMedia from './scripts/postcss-hover-media.mjs';

// Vite (and so Astro) picks this up for every stylesheet, including component
// `<style>` blocks. See scripts/postcss-hover-media.mjs.
export default {
  plugins: [hoverMedia()],
};
