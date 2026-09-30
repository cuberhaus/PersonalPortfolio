/**
 * Build-time analytics configuration (issue #13).
 *
 * Consumed by:
 *   - src/layouts/Layout.astro and DemoLayout.astro (render <Analytics /> only when set)
 *   - src/components/Analytics.astro (the consent banner)
 *   - src/components/AnalyticsSettingsButton.astro ("Privacy settings" buttons)
 *
 * See docs/guides/analytics-and-privacy.md.
 */
import { parseMeasurementId } from '../lib/analytics-consent';

/**
 * GA4 measurement ID baked in from `PUBLIC_GA_ID` (a GitHub repository
 * variable in CI), or `null` when it is unset or invalid.
 *
 * `null` switches analytics off for the whole site: no consent banner, no
 * "Privacy settings" buttons, no consent script on any page and no Google code
 * path. Setting the ID only turns the consent UI on — nothing loads from Google
 * until a visitor accepts.
 */
export const ANALYTICS_MEASUREMENT_ID: string | null = parseMeasurementId(
  import.meta.env.PUBLIC_GA_ID
);

/** DOM id of the consent panel, referenced by the settings buttons' `aria-controls`. */
export const ANALYTICS_PANEL_ID = 'analytics-consent-panel';
