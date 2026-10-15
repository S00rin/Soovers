# SooVers 0.5 validation — 2026-10-15

This report applies to the local F5 Academy update built from the supplied 0.4.0 source. `VALIDATION.md` records the previous release's history; its Docker, cloud and clean-clone claims are not new validations of 0.5.

| Check | Result |
|---|---|
| Frozen dependency installation | Passed with the supplied lockfile and existing dependency build policies. |
| TypeScript | `tsc --noEmit` passed. |
| Production build | Passed with Vite. The main Three.js/UI chunk still emits a size warning; no performance guarantee is implied. |
| Existing motion, campus and learning logic | Passed, including access, incident state, scoring, collision, scene disposal, assessment and terminal checks. |
| F5 training logic | Passed malformed-storage validation and 18 evidence/diagnosis/remediation checks. Duplicate evidence cannot satisfy the evidence gate. |
| F5 browser workflow | All 12 scenarios passed in Chrome 155 with software WebGL. See `validation-f5-browser.json`. |
| Existing tower/classroom/SOC workflow | All 14 scenarios passed, including role changes, teaching, whiteboard, terminal, SOC, device explorer, ATT&CK/CTF, persistence and mobile dialogs. The final complete software-rendering run used the application's low-quality setting; see `validation-legacy-browser.json`. |
| HTTP server | Health, subpath, local assets/fonts, traversal rejection, malformed URL, methods and headers passed. |
| Portable archive | Extracted and every manifest entry checked. Packaged build assets matched the tested build byte for byte; `node run.mjs` served version 0.5.0, HTML, JS, CSS, favicon and font successfully. |

F5 browser coverage includes six selectable 3D components and Unbox; platform changes; Blocking versus Transparent traffic; timed and stepped flow; searchable logs and field explanations; all three cases with failed-action recovery and an evidence gate; a 100-point report verified against saved progress after reload; source-dialog focus and Escape; tower/academy navigation; all six sections at 390×844 and 844×390; unavailable WebGL; denied storage; and zero application errors or missing local assets. Desktop visual review used 1440×1000 screenshots.

Two integration issues found during testing were corrected: reduced-motion campus transitions now complete synchronously instead of waiting for another expensive render frame; the academy shortcut sits below campus dialogs so it cannot intercept their close buttons on mobile.

Limits: browser viewport tests are not physical phone or headset tests. No real F5 VM/TMM, SIEM connection, multiuser service or production deployment was tested or implemented. The model is schematic and event fixtures/console outputs are synthetic. Windows batch lookup is provided for installed Node or Codex's local Node runtime; the packaged Node launcher was exercised directly. No new Docker or GitHub Actions run is claimed.
