# Academy 1.0 validation

Validated on 15 October 2026 in the managed Linux workspace. Repository baseline: `c622591`; the original demo ZIP was preserved. This is the first editable product source release, version 1.0.0, schema migration `001_academy.sql`.

| Check | Result |
|---|---|
| Frozen dependency installation in a fresh Docker build | Passed with pnpm 11.25.0 |
| TypeScript `pnpm check` | Passed |
| Existing motion, campus, learning and F5 logic tests | Passed |
| API integration `pnpm test:api` | 10 scenario groups passed (11 tests including the parent suite) |
| Production Vite build | Passed |
| Static preview HTTP server regression suite | Passed |
| Authenticated product Chromium journey | 12 scenarios passed; no runtime errors |
| F5 preview Chromium suite | 12 scenarios passed; no runtime errors |
| Campus Chromium suite | 14 scenarios passed; no runtime errors |
| Docker image build | Passed; pinned Node 24 base image |
| Docker runtime / persistence / recovery | Passed; non-root, read-only filesystem, persistent volume, production cookies, restart, verified backup, restore, operator account creation/reset |

Product browser checks cover desktop/mobile RTL onboarding, registration, enrollment, all six device parts, a failed save and retry on mobile, all three server-validated labs, explicit assessment grading, reload persistence, authenticated report download, attempt history, a second independent browser login, password changes, logout, account isolation, and a delayed lab response after changing accounts.

API checks cover anonymous access denial, same-origin request enforcement, malformed requests, weak passwords, password/session storage, enrollment gating, cross-account isolation, forged progress/score rejection, evidence and remediation validation, idempotent lab credit, best assessment result, restart persistence, password revocation, logout/expiry, persistent throttling, production Secure cookies and closed registration.

Container validation runs an actual production image with an HTTPS public-origin configuration and a local HTTP reverse-proxy-style test connection. It verifies server behavior and cookie attributes; it does not install the infrastructure team's public TLS certificate or validate their external network.

Initial product build local image ID: `sha256:9eec4fafe6f5d973af6e4c6f190238afc85651852a2383a140fef187878fdee6` (`soovers-academy:1.0.0`, Linux amd64). This is a local image identifier, not a published registry digest.

## Evidence

- [Welcome screen](screenshots/academy-welcome.png)
- [Learner home](screenshots/academy-learning.png)
- [Mobile onboarding](screenshots/academy-mobile.png)
- Regenerable raw reports: `test-results/product/results.json`, `test-results/f5/browser-results.json`, and `test-results/browser-results.json`. Test output is deliberately excluded from Git and release packages.
- `scripts/test-container.mjs` is the repeatable infrastructure smoke test. It cleans up only the temporary container and volume it creates.

## Remaining deployment work

The application has not been deployed to a public/organizational hostname. The infrastructure team must supply the domain and TLS, name the account recovery contact, schedule protected off-host backups, and run a restore drill on its storage. External SSO, email delivery, real-device labs and live classes are not part of this release.

No physical mobile device, headset, large concurrent class, or independent penetration test was used. Chromium ran headlessly with software WebGL. The campus used its low-quality setting. Vite reports the inherited Three.js chunk above 500 kB; course/campus code is loaded separately from onboarding, but further device performance work remains.

## Optional placement and published demo

The release follow-up removes placement prerequisites from both navigation and the 3D engine. Classroom, laboratory and all five lessons open before assessment; skipping preserves a null placement result. The F5 assessment is also optional.

- Local validation: typecheck, unit checks, product build, separate static demo build, 14 campus browser scenarios and 12 F5 scenarios against the account-free demo passed. The demo passed mobile portrait/landscape, report export, persisted progress, disabled WebGL and denied storage scenarios.
- [GitHub Actions run 38722113927](https://github.com/S00rin/Soovers/actions/runs/38722113927) passed on source commit `db55de1`, including all API/browser suites, a fresh Docker build, and container persistence/recovery checks.
- The GitHub `demo` branch contains only the static preview. Its learning state stays in the browser; account-backed persistence runs in the Docker product.
