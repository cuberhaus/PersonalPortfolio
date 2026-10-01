# Security Policy — PersonalPortfolio

## Reporting a Vulnerability

If you discover a security vulnerability, please email polcg10@gmail.com. Do not open a public issue.

## Security Considerations

Demo services come in two tiers with different rules. **Local demo services** are the default and stay on the developer's machine. A **hosted demo service** is a deliberate, opt-in exception that is public on the internet and must meet a stricter contract.

### Local-Only Services (default tier)

- The portfolio includes local microservices (FastAPI planner-api on port 8765, various demo backends) intended for local development and demonstration only.
- These services have **no authentication or authorization**. Do not expose them to the public internet; the only exception is a hosted demo service provisioned under the rules below.
- Bind all demo services to `127.0.0.1` to prevent accidental external access.

### No Auth on Demo Endpoints

- Demo backend endpoints accept arbitrary input without validation or rate limiting.
- If repurposing any demo service for production use, add authentication, input validation, and rate limiting.
- Do not store sensitive data in demo services.

### Hosted Demo Services (Public Tier)

A hosted demo service runs on a public host (for example Render's free tier) so visitors of the deployed site can start a live copy of a demo. It is **public and unauthenticated by design**, so assume anyone on the internet can call it:

- **Nothing sensitive, nothing stateful.** No secrets, credentials, personal data or persistent user data in the service or its image. Treat every request as hostile input.
- **Bounded work.** Enforce request body size, per-request time and parallelism limits inside the service. A free host shares one monthly instance-hour budget, so unbounded work lets a stranger exhaust it and suspend the service; availability is best-effort.
- **Browser access is an allowlist.** `/health` answers CORS only for the portfolio origin and local development origins; the service allows framing only by the portfolio origin (`frame-ancestors`).
- **Observability by environment.** The Sentry DSN comes from environment variables on the host, never from the repository.
- **Nothing wakes it but a visitor.** The page requests the hosted origin only after the visitor presses Start. No scheduled job, uptime monitor or keep-warm ping calls it: a free host's instance hours are shared by every service in the workspace, so a ping that keeps one awake spends the budget of all of them (the hosting plan is tracked in [#177](https://github.com/cuberhaus/PersonalPortfolio/issues/177)).
- **Registry off switch.** `backend.hosted.enabled` in `src/data/demo-services.json` turns the hosted path off without touching the service. Set it to `false` and redeploy to roll back; the registry contract rejects a switched-on entry without an HTTPS URL.
- **Content-Security-Policy.** The site sets none today. If one is added through the hosting platform, `connect-src` and `frame-src` must allow the hosted origin or the live app will be blocked silently.

See [docs/guides/adding-a-demo.md](docs/guides/adding-a-demo.md#hosted-live-app-opt-in) for the registry block and the contract a hosted service must meet.

### Static Site (Astro)

- The Astro static site itself has minimal attack surface since it serves pre-built HTML/CSS/JS.
- Ensure no sensitive data (API keys, credentials, personal tokens) is included in the static build output.
- Review third-party scripts and analytics for privacy implications.
- Google Analytics 4 is **opt-in**: it is configured only when `PUBLIC_GA_ID` is set at build time, and even then nothing loads from Google until a visitor accepts the consent banner. The choice is kept in the visitor's own browser (`localStorage`), never on a server. See [docs/guides/analytics-and-privacy.md](docs/guides/analytics-and-privacy.md).
- If you add a `Content-Security-Policy`, allow Google's tag only for analytics: `https://www.googletagmanager.com` in `script-src`, and `https://*.google-analytics.com`, `https://*.analytics.google.com` and `https://*.googletagmanager.com` in `connect-src`.
- Set security headers via hosting platform: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`.

### Recommendations

- Use separate configurations for demo vs. production services.
- Keep Astro and npm dependencies updated — run `npm audit` periodically.
- If deploying to a CDN/hosting platform, enable HTTPS and configure proper caching headers.
- Review any contact forms or interactive elements for spam and injection vulnerabilities.
