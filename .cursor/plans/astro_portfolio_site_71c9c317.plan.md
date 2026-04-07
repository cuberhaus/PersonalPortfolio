---
name: Astro Portfolio Site
overview: Build a dark-themed, minimal yet visually striking portfolio using Astro, deployed to GitHub Pages via GitHub Actions. Single-page layout with smooth scroll animations, gradient accents, and a polished developer aesthetic.
todos:
  - id: scaffold
    content: Scaffold Astro project, configure for GitHub Pages (astro.config.mjs, tsconfig, package.json)
    status: completed
  - id: global-styles
    content: Create global CSS with dark theme custom properties, reset, typography (Inter font)
    status: completed
  - id: layout
    content: Build Layout.astro base shell (head, meta tags, font imports, global styles)
    status: completed
  - id: navbar
    content: Build Navbar component with glassmorphism effect and smooth-scroll links
    status: completed
  - id: hero
    content: Build Hero section with animated gradient background, name, tagline, CTA
    status: completed
  - id: about
    content: Build About section with two-column layout
    status: completed
  - id: projects
    content: Build Projects section with glowing card grid, sourced from projects.json
    status: completed
  - id: skills
    content: Build Skills section with grouped badge/pill layout from skills.json
    status: completed
  - id: experience
    content: Build Experience timeline with scroll-triggered animations from experience.json
    status: completed
  - id: contact-footer
    content: Build Contact section with social links and minimal Footer
    status: completed
  - id: scroll-animations
    content: Add Intersection Observer-based scroll animations (fade-in, slide-up)
    status: completed
  - id: responsive
    content: Ensure full responsiveness across mobile, tablet, desktop
    status: completed
  - id: deploy
    content: Add GitHub Actions deploy workflow for GitHub Pages
    status: completed
isProject: false
---

# Astro Personal Portfolio for GitHub Pages

## Tech Stack

- **Astro** — static site generator, outputs zero-JS HTML by default
- **Pure CSS** — custom properties for theming, no CSS framework (keeps it lightweight and unique)
- **Vanilla JS** (sprinkled) — for scroll-triggered animations via Intersection Observer and a subtle interactive background
- **GitHub Actions** — automated deploy to GitHub Pages on push to `main`

## Design Direction: Dark Minimal

- **Color palette**: Deep charcoal/near-black background (`#0a0a0f`), soft white text, accent gradient (electric blue to purple, e.g. `#6366f1` to `#a855f7`)
- **Typography**: Inter (or similar clean sans-serif) from Google Fonts
- **Visual flair**:
  - Subtle animated gradient mesh or grid-dot background on the hero
  - Glow effects on hover (cards, buttons)
  - Smooth fade-in / slide-up animations on scroll (via Intersection Observer, no heavy libraries)
  - Accent gradient used on headings, links, and dividers
- **Layout**: Single-page, vertical scroll through sections with a sticky/fixed nav

## Site Structure

```
PersonalPortfolio/
  astro.config.mjs        # Astro config (site URL, GitHub Pages base)
  package.json
  tsconfig.json
  public/
    favicon.svg
  src/
    layouts/
      Layout.astro         # Base HTML shell (head, fonts, global styles)
    pages/
      index.astro          # Single page, imports all sections
    components/
      Navbar.astro         # Fixed top nav with smooth-scroll links
      Hero.astro           # Name, tagline, animated background, CTA
      About.astro          # Short bio, profile image placeholder
      Projects.astro       # Card grid with hover glow, links to repos/demos
      Skills.astro         # Tech icon/badge grid grouped by category
      Experience.astro     # Vertical timeline with fade-in entries
      Contact.astro        # Social links (GitHub, LinkedIn, email)
      Footer.astro         # Minimal footer
    styles/
      global.css           # CSS reset, custom properties, base styles
    data/
      projects.json        # Project data (title, description, tags, links)
      experience.json      # Experience entries (role, company, dates, bullets)
      skills.json          # Skill categories and items
  .github/
    workflows/
      deploy.yml           # GitHub Actions workflow for Pages deploy
```

## Section Breakdown

### 1. Navbar

- Fixed at top, semi-transparent dark glass effect (`backdrop-filter: blur`)
- Links: Hero, About, Projects, Skills, Experience, Contact
- Active section highlighting on scroll

### 2. Hero

- Full viewport height
- Large name + one-line tagline + subtle animated gradient mesh behind text
- CTA button ("View my work") scrolls to Projects

### 3. About

- Two-column: text left, image/avatar placeholder right
- Brief bio paragraph with gradient-accented highlights

### 4. Projects

- Responsive card grid (2-3 columns)
- Each card: title, short description, tech tags, GitHub/live links
- Hover effect: subtle glow border + slight scale
- Data sourced from `src/data/projects.json` for easy editing

### 5. Skills

- Grouped by category (Languages, Frameworks, Tools, etc.)
- Badge/pill style with subtle hover glow
- Data from `src/data/skills.json`

### 6. Experience

- Vertical timeline with alternating left/right entries (or left-aligned on mobile)
- Each entry: role, company, date range, bullet points
- Scroll-triggered fade-in animation
- Data from `src/data/experience.json`

### 7. Contact

- Icon links: GitHub, LinkedIn, Email (mailto)
- Optional: simple "Get in touch" message
- No form needed (GitHub Pages has no backend)

### 8. Footer

- Minimal: "Built with Astro" + copyright year

## Deployment

- GitHub Actions workflow (`.github/workflows/deploy.yml`) that:
  1. Checks out code
  2. Installs dependencies (`npm ci`)
  3. Builds the site (`astro build`)
  4. Deploys `dist/` to GitHub Pages using `actions/deploy-pages`
- `astro.config.mjs` sets `site` and `base` for the GitHub Pages URL

## Key Design Decisions

- **No CSS framework** — keeps the bundle tiny and the design unique; CSS custom properties make theming trivial
- **No JS framework** — Astro renders everything at build time; the small JS for scroll animations is inlined
- **Data files** — projects, skills, and experience live in JSON so you can update content without touching components
- **Responsive** — mobile-first CSS with breakpoints for tablet/desktop

