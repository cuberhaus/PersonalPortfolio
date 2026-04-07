---
name: General QoL Improvements
overview: Implement a Dark/Light mode toggle, a Scroll-to-Top button, copy-link functionality for demos, and comprehensive accessibility/smooth-scrolling enhancements across the portfolio.
todos:
  - id: theme-toggle
    content: Implement Dark/Light mode CSS variables and ThemeToggle component
    status: completed
  - id: scroll-top
    content: Create and integrate the Scroll-to-Top button
    status: completed
  - id: a11y-focus
    content: Add global accessibility focus styles and skip-to-content link
    status: completed
  - id: copy-link
    content: Add Copy Link / Share buttons to the demo pages
    status: completed
isProject: false
---

# Quality of Life (QoL) Improvements Plan

## 1. Dark/Light Theme Toggle

- **CSS Variables**: Refactor `src/styles/global.css`. Move the current dark theme colors into a default scope and create a new `[data-theme='light']` selector with light mode equivalent colors (e.g., white background, dark text, adjusted borders).
- **Theme Toggle Component**: Create a new `ThemeToggle.astro` component containing a button that switches between Sun and Moon icons.
- **FOUC Prevention**: Add an inline `<script>` to the `<head>` in `src/layouts/Layout.astro` to read the user's system preference or `localStorage` before the page renders, preventing a "Flash of Unstyled Content".
- **Integration**: Add the `ThemeToggle` component into `Navbar.astro`, next to the language picker.

## 2. Scroll to Top Button

- **Component**: Create `src/components/ScrollToTop.astro`.
- **Styling**: Use `position: fixed` in the bottom-right corner. It will be hidden (`opacity: 0`, `translateY`) by default and become visible when the user scrolls down.
- **Logic**: Add an event listener to `window` for the `scroll` event. Show the button when `window.scrollY > 300`. On click, execute `window.scrollTo({ top: 0, behavior: 'smooth' })`.
- **Integration**: Place this component at the bottom of `src/layouts/Layout.astro`.

## 3. Accessibility Enhancements (a11y)

- **Focus Rings**: Add a global `:focus-visible` style in `src/styles/global.css` to provide clear, high-contrast outlines for keyboard users navigating the site. Remove the default browser outline and replace it with `outline: 2px solid var(--accent-start); outline-offset: 4px;`.
- **ARIA Labels**: Review anchor tags (`<a>`) and buttons (`<button>`) across components to ensure they have descriptive `aria-label` attributes where text is not explicitly clear.
- **Skip to Content**: Add a visually hidden "Skip to content" link at the very top of `Layout.astro` that focuses the `<main>` tag when clicked, helping screen reader and keyboard users bypass the navbar.

## 4. Copy Demo Links

- **Layout Update**: Update the `src/layouts/DemoLayout.astro` (or the top of the individual demo pages) to include a "Copy Link" / "Share" button next to the Demo title.
- **Clipboard API**: Add a small client-side script to handle `navigator.clipboard.writeText(window.location.href)`.
- **Visual Feedback**: Briefly change the icon to a checkmark (✓) and update the tooltip to say "Copied!" for 2 seconds after clicking.

## 5. Smooth Scrolling

- **Confirmation**: Ensure `html { scroll-behavior: smooth; scroll-padding-top: var(--nav-height); }` remains intact in `global.css` so all anchor links (`#about`, `#projects`, etc.) glide smoothly.
- **Cross-browser Fallbacks**: Ensure any manual JS scrolls (like the Scroll to Top button) explicitly pass `{ behavior: 'smooth' }`.

