# Personal Portfolio

A dark-themed, minimal portfolio site built with [Astro](https://astro.build), deployed to GitHub Pages.

## Getting Started

```bash
npm install
npm run dev        # Start dev server at localhost:4321
npm run build      # Build for production
npm run preview    # Preview the production build
```

## Interactive Demos

The portfolio includes interactive demo pages for several projects. Some run entirely in the browser, others need local services.

| Demo | Type | Notes |
|------|------|-------|
| WPGMA Clustering | Browser | Fully client-side (TypeScript port) |
| JSBach Interpreter | Browser | Fully client-side (TypeScript interpreter + Web Audio) |
| EDA Game Viewer | Browser | Opens viewer in a new tab; supports replay file upload |
| Tenda Online | Local | Needs PHP + MySQL (see below) |
| Draculin | Local + Mock | Django backend for live chat/news; React mock for quiz/stats/calendar |

### Running Tenda Online locally

The Tenda demo page automatically embeds the real PHP app in dev mode. To start it:

```bash
cd ../tenda_online
docker compose up -d    # Start MySQL + PHP server at http://localhost:8888
```

Then in the portfolio dev server, the Tenda demo page will show the live app in an iframe. In production (GitHub Pages), a client-side mock is shown instead.

### Running Draculin backend locally

The Draculin demo connects to the Django backend when available (for live chat and news). Without it, everything works with mock data.

```bash
cd ../Draculin-Backend
docker compose up -d    # Start Django API at http://localhost:8889
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
