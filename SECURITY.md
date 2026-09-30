# Security Policy — PersonalPortfolio

## Reporting a Vulnerability

If you discover a security vulnerability, please email polcg10@gmail.com. Do not open a public issue.

## Security Considerations

### Local-Only Services

- The portfolio includes local microservices (FastAPI planner-api on port 8765, various demo backends) intended for local development and demonstration only.
- These services have **no authentication or authorization**. Do not expose them to the public internet.
- Bind all demo services to `127.0.0.1` to prevent accidental external access.

### No Auth on Demo Endpoints

- Demo backend endpoints accept arbitrary input without validation or rate limiting.
- If repurposing any demo service for production use, add authentication, input validation, and rate limiting.
- Do not store sensitive data in demo services.

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
