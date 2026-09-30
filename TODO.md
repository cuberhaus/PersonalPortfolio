## Google Analytics (GA4)

Consent-first analytics is built and tested (issue #13): nothing loads from Google until a visitor accepts, and a build without `PUBLIC_GA_ID` has no analytics at all. Full details in [docs/guides/analytics-and-privacy.md](docs/guides/analytics-and-privacy.md). To switch it on:

- [ ] Create a GA4 property with a web data stream and copy its measurement ID (`G-…`).
- [ ] Add it as the repository **variable** `PUBLIC_GA_ID` (Settings → Secrets and variables → Actions → Variables), then re-run the **Deploy to GitHub Pages** workflow.
- [ ] Check it in a fresh private window: the banner appears, no Google requests before **Accept analytics**, and the visit shows in GA4 Realtime.
- [ ] Optional: publish a short public privacy notice page and mention it in the banner copy (`analytics.description` in `locales/*/ui.json`).
- [ ] Optional: review the EN/ES/CA banner wording; it is legal-adjacent copy.
