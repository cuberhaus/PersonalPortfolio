## Google Analytics (GA4)

`Analytics.astro` reads `PUBLIC_GA_ID` from the environment and only injects the GA4 pixel when it's set to a valid `G-...` ID. To enable in production, set the secret in the GitHub Pages deploy workflow (or in `.env` for local dev).
