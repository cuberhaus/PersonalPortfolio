/**
 * Build-time configuration of the cookieless visit counter.
 *
 * Consumed by:
 *   - src/layouts/Layout.astro and DemoLayout.astro (render <VisitCounter /> only when set)
 *   - src/components/VisitCounter.astro (starts the counter in the browser)
 *
 * See docs/guides/analytics-and-privacy.md.
 */
import { parseSiteCode } from '../lib/visit-counter';

/**
 * GoatCounter site code baked in from `PUBLIC_GOATCOUNTER_CODE` (a GitHub repository variable in
 * CI), or `null` when it is unset or invalid.
 *
 * `null` switches the counter off for the whole site: no counter script on any page and no
 * request to GoatCounter. Unlike `ANALYTICS_MEASUREMENT_ID`, setting it asks the visitor nothing:
 * the counter is cookieless and counts everyone, whatever they chose about Google Analytics.
 */
export const VISIT_COUNTER_CODE: string | null = parseSiteCode(
  import.meta.env.PUBLIC_GOATCOUNTER_CODE
);
