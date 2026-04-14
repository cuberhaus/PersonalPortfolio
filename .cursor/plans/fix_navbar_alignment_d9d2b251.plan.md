---
name: Fix Navbar Alignment
overview: Center the items in the navigation bar to fix the vertical alignment issue of the language picker and theme toggle.
todos:
  - id: align-nav-links
    content: "Add `align-items: center` to `.nav-links` in `Navbar.astro`"
    status: completed
  - id: optical-alignment
    content: Optical alignment tweaks if necessary for uppercase `.lang-link` text
    status: completed
isProject: false
---

# Fix Navbar Alignment

The issue occurs because the `.nav-links` container in the main navigation bar is missing the `align-items: center;` CSS property. This causes the items (which have different heights and font sizes) to not align perfectly on the vertical axis, making the language picker text and theme toggle appear slightly too high compared to the other navigation links.

## Steps

1. **Update `src/components/Navbar.astro`**
  Add `align-items: center;` to the `.nav-links` CSS class.
   Make sure the list items themselves also use flex centering to perfectly align the `LanguagePicker` and `ThemeToggle` components.
2. **Optical alignment check**
  If `align-items: center` still leaves the uppercase language codes ("EN ES CA") looking optically a tiny bit high (due to font baseline differences between 0.9rem text and 0.8rem all-caps text), we can adjust them down by `1px` or align them using `margin-top`.

I will make these alignment adjustments to ensure the navbar looks crisp and perfectly aligned horizontally.