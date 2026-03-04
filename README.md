# Personal Portfolio

A dark-themed, minimal portfolio site built with [Astro](https://astro.build), deployed to GitHub Pages.

## Getting Started

```bash
npm install
npm run dev        # Start dev server at localhost:4321
npm run build      # Build for production
npm run preview    # Preview the production build
```

## Customizing

- **Your info**: Edit names, tagline, and bio directly in the `.astro` components under `src/components/`
- **Projects**: Edit `src/data/projects.json`
- **Skills**: Edit `src/data/skills.json`
- **Experience**: Edit `src/data/experience.json`
- **Links**: Update GitHub, LinkedIn, and email URLs in `src/components/Contact.astro`
- **Site URL**: Update `site` and `base` in `astro.config.mjs` to match your GitHub Pages URL

## Deployment

Pushes to `main` automatically deploy to GitHub Pages via the included GitHub Actions workflow (`.github/workflows/deploy.yml`).

Make sure GitHub Pages is configured to deploy from **GitHub Actions** in your repository settings (Settings > Pages > Source > GitHub Actions).
