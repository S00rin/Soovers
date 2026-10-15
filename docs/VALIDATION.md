# SooVers 0.4 validation

Validation uses the supplied source plus the education changes in this repository. Results below distinguish software checks from hardware and service integrations.

| Check | Result |
|---|---|
| Frozen dependency install, pnpm 11.25.0 | Passed; integrity/supply-chain verification retained. Overrides and dependency build approvals live in `pnpm-workspace.yaml`. |
| TypeScript (`pnpm check`) | Passed. Missing exported mobile hook restored; obsolete host-only Vite configuration replaced with portable client configuration. |
| Motion suite | Passed: timelines at different refresh rates, interruption, pause, replay, return and reduced motion. |
| Campus suite | Passed: roles, incident phases, wrong answers, duplicate-score prevention, 100-point cap, report, collision, reachable interactive surfaces, all eight scene graphs and disposal. |
| Learning suite | 7 checks passed: assessment validation, thresholds/domains, adaptive routes, storage validation, firewall/IDS paths, five ATT&CK decisions and terminal state transitions. |
| Browser workflow | 14 scenarios passed in Chromium headless with SwiftShader, including seated classroom view, teacher controls, complete workstation/SOC/CTF flow, report export, reload and role revocation. |
| Desktop / mobile layouts | 1440×900, 390×844 and 844×390 verified in browser viewports; this is not a physical phone test. |
| HTTP server | Passed: health, subpath redirect, bundled assets/fonts, traversal rejection, malformed URL, allowed methods and response headers. |
| Docker | Full multi-stage build passed with pinned Node 24 image; TypeScript/tests/build executed inside builder. Runtime health and application document passed; runtime runs as non-root with read-only filesystem and dropped capabilities. |
| Physical headset / real phone | Not run; no hardware attached. |
| Real SIEM, VM, multiuser, production identity | Not implemented or claimed by this local demo. |

The Docker builder in the cloud required the existing proxy route, resolved proxy hostname and the platform's trusted CA supplied as an ephemeral BuildKit secret. TLS checks stayed enabled. A normal server with public CA trust does not require these cloud-specific flags.

A failed browser test exposed an effect cleanup problem caused by implicitly returning `scrollIntoView()` in a newer browser. The effect now explicitly returns nothing; the complete workstation and SOC flow passed afterwards. The lesson's first incorrect-answer test had a mismatched expected phrase; the assertion was corrected to the actual feedback text without weakening the behavior check.

Build emits a chunk-size warning for the combined UI/Three.js bundle (about 1 MB uncompressed). No universal FPS guarantee is made. Browser run uses software rendering; it does not establish headset performance or photorealism.

CI is configured in `.github/workflows/verify.yml`; local validation does not claim a completed GitHub Actions run or a deployment on the user's server.

The saved development startup command (`pnpm dev:selfhost`) was also exercised: the browser entered reception, selected a student card, loaded a restored path, entered class and executed `cat auth.log` without application errors.

A separate clean clone of source commit `17b7696` was installed with the frozen lockfile and integrity verification, then passed TypeScript, motion/campus/learning tests, production build and HTTP server checks. No existing `node_modules` or generated build directory was copied into that checkout.

The final archive was extracted into a separate directory. Every file matched its SHA-256 manifest; its `node run.mjs` launcher served healthy HTML, JS, CSS, favicon and offline references. Final build files were byte-identical to the clean-clone build.
