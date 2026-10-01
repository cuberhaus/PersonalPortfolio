## Google Analytics (GA4)

Consent-first analytics is built and tested (issue #13): nothing loads from Google until a visitor accepts, and a build without `PUBLIC_GA_ID` has no analytics at all. Full details in [docs/guides/analytics-and-privacy.md](docs/guides/analytics-and-privacy.md). To switch it on:

- [x] Create a GA4 property with a web data stream and copy its measurement ID (`G-…`).
- [x] Add it as the repository **variable** `PUBLIC_GA_ID` (Settings → Secrets and variables → Actions → Variables), then re-run the **Deploy to GitHub Pages** workflow.
- [x] Check it in a fresh private window: the banner appears, no Google requests before **Accept analytics**, and the visit shows in GA4 Realtime.
- [ ] Optional: publish a short public privacy notice page and mention it in the banner copy (`analytics.description` and `analytics.descriptionWithCounter` in `locales/*/ui.json`). More worthwhile now that the visit counter runs without asking.
- [ ] Optional: review the EN/ES/CA banner wording, including the new counter sentence; it is legal-adjacent copy.

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
- [ ] When adding a privacy notice page, mention Sentry and the visit counter as well as GA ([guide](docs/guides/analytics-and-privacy.md#ga4-admin-checklist-after-go-live)).

## Visit counter (GoatCounter)

A cookieless counter that counts every visit, whatever the visitor chose about Google Analytics, is built and tested. It is off in any build without a site code. The first two steps are done, so the first deploy of this code builds with the counter on; the rest verify and tune it. Details in [docs/guides/analytics-and-privacy.md](docs/guides/analytics-and-privacy.md#the-visit-counter-goatcounter):

- [x] Create a free GoatCounter site at [goatcounter.com/signup](https://www.goatcounter.com/signup) and note the site code (the part before `.goatcounter.com`).
- [x] Add it as the repository **variable** `PUBLIC_GOATCOUNTER_CODE` (Settings → Secrets and variables → Actions → Variables). The next deploy builds with it; re-run **Deploy to GitHub Pages** only if the variable changes later.
- [ ] Check it in a fresh private window: one request to `<code>.goatcounter.com/count` before you touch the panel, nothing to Google after **Reject analytics**, and the visit in the GoatCounter dashboard.
- [ ] Exclude your own browsers: run `localStorage.setItem('skipgc', 't')` in the console on the live site, once per browser.
- [ ] Review what GoatCounter keeps in its settings and switch off anything you do not need.
- [ ] Decide whether to honor Do Not Track / Global Privacy Control (currently not, same as GoatCounter's own script; a two-line change, see the guide).
