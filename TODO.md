## Google Analytics (GA4)

Consent-first analytics is built and tested (issue #13): nothing loads from Google until a visitor accepts, and a build without `PUBLIC_GA_ID` has no analytics at all. Full details in [docs/guides/analytics-and-privacy.md](docs/guides/analytics-and-privacy.md). To switch it on:

- [x] Create a GA4 property with a web data stream and copy its measurement ID (`G-…`).
- [x] Add it as the repository **variable** `PUBLIC_GA_ID` (Settings → Secrets and variables → Actions → Variables), then re-run the **Deploy to GitHub Pages** workflow.
- [x] Check it in a fresh private window: the banner appears, no Google requests before **Accept analytics**, and the visit shows in GA4 Realtime.
- [ ] Optional: publish a short public privacy notice page and mention it in the banner copy (`analytics.description` in `locales/*/ui.json`).
- [ ] Optional: review the EN/ES/CA banner wording; it is legal-adjacent copy.

After go-live, finish GA4 Admin (see [GA4 admin checklist (after go-live)](docs/guides/analytics-and-privacy.md#ga4-admin-checklist-after-go-live)):

- [x] Confirm data arrives (private window, Network, Realtime) before any internal-traffic filter ([guide](docs/guides/analytics-and-privacy.md#confirm-data-arrives)).
- [ ] Turn Google signals off in Admin ([guide](docs/guides/analytics-and-privacy.md#ga4-admin-checklist-after-go-live)).
- [ ] Keep Enhanced measurement **Page changes based on browser history events** on ([guide](docs/guides/analytics-and-privacy.md#ga4-admin-checklist-after-go-live)).
- [ ] Set event data retention to 14 months ([guide](docs/guides/analytics-and-privacy.md#ga4-admin-checklist-after-go-live)).
- [ ] Exclude your own visits (Reject in your browsers or internal-traffic filter) ([guide](docs/guides/analytics-and-privacy.md#ga4-admin-checklist-after-go-live)).
- [ ] Mark `file_download` as a key event after the first CV download ([guide](docs/guides/analytics-and-privacy.md#ga4-admin-checklist-after-go-live)).
- [ ] Review Account data sharing settings ([guide](docs/guides/analytics-and-privacy.md#ga4-admin-checklist-after-go-live)).
- [ ] Skim Consent settings in Admin (INFO; warnings until granted traffic) ([guide](docs/guides/analytics-and-privacy.md#ga4-admin-checklist-after-go-live)).
- [ ] GA account hygiene: 2-step verification and sole Administrator ([guide](docs/guides/analytics-and-privacy.md#ga4-admin-checklist-after-go-live)).
- [ ] Optional: link Search Console; skip BigQuery/audiences for a portfolio ([guide](docs/guides/analytics-and-privacy.md#ga4-admin-checklist-after-go-live)).
- [ ] Remember consent-mode counts are trends-only, not full traffic ([guide](docs/guides/analytics-and-privacy.md#ga4-admin-checklist-after-go-live)).
- [ ] When adding a privacy notice page, mention Sentry as well as GA ([guide](docs/guides/analytics-and-privacy.md#ga4-admin-checklist-after-go-live)).
