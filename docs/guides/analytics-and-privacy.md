# Analytics and privacy

The portfolio can measure visits with **Google Analytics 4 (GA4)**, but only with
the visitor's consent. This works on a static site because GA4 is a client-side
script: there is no server to configure. The hard part is not loading it, it is
_not_ loading it until a visitor says yes, which is what this guide is about.

> **TL;DR** — set the repository variable `PUBLIC_GA_ID` to turn it on. Until a
> visitor accepts, the browser makes **no request** to Google. Without the
> variable, no page shows a banner, loads a consent script or contacts Google.

## What happens when

| Situation                     | The visitor sees                                             | The browser does                                                                     |
| ----------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| No valid `PUBLIC_GA_ID`       | Nothing                                                      | Nothing. No page loads a consent script.                                             |
| ID set, no decision yet       | A bottom panel asking to accept or reject, equally prominent | No request to Google. `window['ga-disable-<ID>']` is `true`.                         |
| Accepted                      | The panel closes; "Privacy settings" stays in the footer     | Loads Google's tag once, remembers `granted`.                                        |
| Rejected                      | The panel closes                                             | Still nothing from Google, remembers `denied`.                                       |
| Changed their mind (withdraw) | "Privacy settings" reopens the panel with the current status | Stops sending, sets the disable flag, clears the Google cookies, remembers `denied`. |
| Choice made in another tab    | The panel in this tab follows the choice within a moment     | The same as above, via the `storage` event, or on `pageshow` for a cached page.      |

## Turning it on (owner steps)

1. In Google Analytics, create a GA4 property with a **web data stream** and copy
   its measurement ID (`G-…`). Leave _Enhanced measurement_ on: the site relies on
   its "page changes based on browser history events" for client-side navigation.
2. In GitHub: **Settings → Secrets and variables → Actions → Variables**, add
   `PUBLIC_GA_ID`. It is a _variable_, not a secret: the ID ships in the page.
3. Re-run **Deploy to GitHub Pages** (push to `main` or _Run workflow_).
   [deploy.yml](../../.github/workflows/deploy.yml) passes `vars.PUBLIC_GA_ID` to
   `npm run build`.
4. Check it in a fresh private window: the panel appears, the Network tab shows
   nothing from `googletagmanager.com` or `google-analytics.com`, and after
   **Accept analytics** a `gtag/js?id=G-…` request appears and the visit shows up
   in GA4 _Realtime_.

To try it locally: `PUBLIC_GA_ID=G-YOURID npm run build && npm run preview:static`
(or put it in `.env` for `npm run dev`). The placeholder in
[.env.example](../../.env.example), `G-XXXXXXXXXX`, is rejected on purpose so that
copying the file verbatim enables nothing.

## How it works

| Piece                                                                                              | Responsibility                                                                                                                     |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| [src/config/analytics.ts](../../src/config/analytics.ts)                                           | The **only** reader of `PUBLIC_GA_ID`. `ANALYTICS_MEASUREMENT_ID` is a valid ID or `null` (off).                                   |
| [src/lib/analytics-consent.ts](../../src/lib/analytics-consent.ts)                                 | The **only** module that knows Google. A controller with injected storage, window and document: decision, tag loading, withdrawal. |
| [src/lib/analytics-consent-ui.ts](../../src/lib/analytics-consent-ui.ts)                           | DOM binder: opens and closes the panel, Escape, focus return, spoken status, re-binding after `astro:page-load`.                   |
| [src/components/Analytics.astro](../../src/components/Analytics.astro)                             | The panel markup, rendered by the layouts only when an ID is set. Fetches the binder lazily, so no other page loads any of it.     |
| [src/components/AnalyticsSettingsButton.astro](../../src/components/AnalyticsSettingsButton.astro) | The "Privacy settings" button (home footer, bottom bar of every demo page). Renders nothing without an ID.                         |
| `locales/{en,es,ca}/ui.json` → `analytics`                                                         | All visible copy. Keys and order must match across locales.                                                                        |

**The decision** lives in `localStorage['analytics-consent']` as `granted` or
`denied`. Any other value means "not decided". It is never sent to a server. If
storage is blocked (some private modes) the choice still applies to the current
page and the visitor is asked again on the next load.

**What Google receives after an accept:** gtag.js with `analytics_storage`
granted. Advertising is always off: `ad_storage`, `ad_user_data` and
`ad_personalization` stay `denied`, and `allow_google_signals` and
`allow_ad_personalization_signals` are `false`.

**On withdrawal** the module sets `window['ga-disable-<ID>']`, sends a
`consent update` with everything denied, and expires the `_ga`, `_ga_<id>`, `_gid`
and `_gat*` cookies on the host and every parent domain. The tag is never
injected twice; accepting again after a withdrawal just flips the signals back.

Two properties are enforced by tests rather than convention:

1. **No page's HTML references Google's tag or servers.** The banner text names
   Google Analytics, but the tag URL exists only inside the consent module, which
   is fetched after opt-in.
2. **A build without a valid ID renders no banner or buttons and loads no consent
   script.** Astro attaches a component's `<script>` to every page that renders
   it, even when it prints nothing, so the layouts render `<Analytics />` only
   when an ID exists. The panel's unused styles still sit in the shared
   stylesheet.

## Adding a page

- **A new layout that owns an `<html>` document:** import `Analytics` and
  `ANALYTICS_MEASUREMENT_ID` and render `{ANALYTICS_MEASUREMENT_ID && <Analytics />}`
  exactly once in `<body>`, directly after the skip link so keyboard users reach
  the choice first. Never put it in `<head>`, and never render it ungated.
- **A new content page:** add `<AnalyticsSettingsButton variant="footer" />` (or
  `"demo"`) next to the other footer or bottom-bar actions. Error pages show the
  panel when undecided but deliberately have no settings link.
- **A new script that must talk to Google:** don't. Extend
  `analytics-consent.ts`, so it stays behind consent.

## Copy and theming

Change the wording in all three `locales/*/ui.json` files together
([i18n guide](./i18n.md)); privacy copy deserves the owner's review. Styling uses
theme tokens only. The panel must stay **opaque**: the end-to-end suite asserts
it, because then contrast can never depend on what happens to be behind it. It is
also capped to the height of the screen and scrolls inside itself, so on a phone
held sideways or at 400% zoom (320x200) its title is never cut off; the suite
checks both sizes.

## Testing

| Seam                                             | Run                                               | Proves                                                                                                                                                                                              |
| ------------------------------------------------ | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Controller ([analytics-consent.test.ts])         | `npm test`                                        | Accept, reject, persistence, withdrawal, cookie clearing, cross-tab, blocked storage, missing or invalid IDs, with fake storage, window and document.                                               |
| Real browser ([analytics-consent.spec.ts])       | `npm run test:e2e:consent` or `make test-consent` | The built site: no Google request before opt-in, persistence across reloads and navigation, withdrawal, several tabs, keyboard use, EN/ES/CA, axe across every theme and design.                    |
| Source guards ([analytics-source-guard.test.ts]) | `npm test`                                        | Only the consent module names Google; one reader of `PUBLIC_GA_ID`; page shells mount the panel in `<body>`; `.env.example` is inert; OG capture pre-denies; the consent code never touches Sentry. |

[analytics-consent.test.ts]: ../../src/__tests__/analytics-consent.test.ts
[analytics-consent.spec.ts]: ../../e2e/analytics-consent.spec.ts
[analytics-source-guard.test.ts]: ../../src/__tests__/analytics-source-guard.test.ts

The browser suite builds a **second copy** of the site with the fake ID
`G-TESTCONSENT` into `node_modules/.cache/analytics-consent-site` (the default
`dist` must stay analytics-free for every other project), serves it on a free port
per worker, and answers every request to a Google host itself, so it never
contacts Google. While iterating, `PLAYWRIGHT_REUSE_CONSENT_BUILD=1` skips the
rebuild.

In CI it runs as an extra step of the `keyboard` leg of the `playwright` job with
its own artifact, `playwright-report-analytics-consent`. It is not a leg of its
own because [test.yml](../../.github/workflows/test.yml) already sits at 19 jobs,
one below GitHub's limit of 20 concurrent jobs.

## Related behaviour

- **OG images.** [capture-og-images.mjs](../../scripts/capture-og-images.mjs)
  seeds a `denied` choice before capturing. Otherwise the banner would be baked
  into every card of an analytics-enabled build, and the CI browser would count as
  a visitor.
- **Sentry is separate.** Error telemetry is not gated by this banner and the
  banner's copy speaks only about Google Analytics. See
  [observability.md](../architecture/observability.md).
- **Not covered by this consent.** Third-party pages reachable from the site run
  their own scripts: embedded live demos, external links, and the saved press
  release `public/deloitte-physical-ai-press-release.html`.

## Why it is built this way

- **Nothing loads before opt-in**, instead of Google's "advanced" Consent Mode
  that sends cookieless pings first. It is the strictest reading of EU rules and
  what issue #13 asked for; the cost is less modelled data, which a portfolio does
  not need.
- **The choice lives only in the browser.** Static hosting has no server to keep
  it, and a server-side consent record was an explicit non-goal.
- **The banner code is fetched lazily and the layouts render the panel only when
  an ID exists.** Forks and builds without analytics load nothing for it.
- **No hand-written `page_view` events.** GA4's enhanced measurement already
  reports history changes, which is how Astro's client-side navigation works.
- **The `.env.example` placeholder is refused.** It is a well-formed ID, so
  without the check a verbatim copy would light up the banner for a property that
  does not exist.

## Troubleshooting

| Symptom                                         | Likely cause                                                                                                                                                                            |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No panel appears on the deployed site           | `PUBLIC_GA_ID` is unset, misspelled, or not a `G-` ID; or the visitor already decided. Clear `analytics-consent` in localStorage, or use "Privacy settings".                            |
| Accepted, but GA4 shows nothing                 | An ad blocker, GA4 _Realtime_ lag, or a wrong ID. Look for `gtag/js?id=G-…` in the Network tab.                                                                                         |
| `make test-consent` says the site was not built | Run it once without `PLAYWRIGHT_REUSE_CONSENT_BUILD` so the second build exists.                                                                                                        |
| You add a Content-Security-Policy               | Allow `https://www.googletagmanager.com` in `script-src`, and `https://*.google-analytics.com`, `https://*.analytics.google.com` and `https://*.googletagmanager.com` in `connect-src`. |
