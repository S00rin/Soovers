# F5 Academy product release

Scope confirmed with the owner: launch the F5 academy first, with real accounts, saved progress, labs, and assessments. Delivery target: a Docker deployment for the infrastructure team.

## Experience

The primary learner journey is registration → enrollment → device exploration → platform concepts → traffic flow → log inspection → incident decisions → assessment → return to learning. The Persian RTL interface uses Vazirmatn, a dark background, and SooVers cyan. The course remains spatial and interactive; account home provides a single resume action, the course outline, and attempt history.

Landing, account home, learning, and settings fit desktop and mobile. Loading, API errors, unavailable WebGL, failed saves/retry, session expiry, empty history, and reduced motion have explicit behavior. Failed saves must be resolved before in-app navigation or logout; closing the browser with an unsaved change prompts the browser's standard warning. A separate preview retains the original demo without mixing its localStorage data into authenticated records.

## Optional assessments and the hosted demo

Placement is a recommendation tool, never a prerequisite. Both UI navigation and the 3D engine allow student entry into classes and labs without a result. The default roadmap lists every lesson; learners who take placement can switch between recommendations and all lessons. A visible skip action leaves their stored placement unchanged. Lesson questions and the F5 assessment are optional; grades still require correct answers and are not fabricated for skipped tests.

The static demo has a separate entrypoint (`local/demo.tsx`), loads the course directly, and makes no account API requests. It stores preview progress only in the browser. The `demo` branch publishes this build for static hosting; Docker continues to serve the authenticated product.

## Data and trust

SQLite migrations define users, opaque sessions, enrollment/progress, lab and assessment attempts, audit events, and persistent authentication throttles. Queries use bound parameters. User identity comes from the session, never a user ID or role in the request. There are no privileged browser roles in the academy.

Passwords use salted scrypt. Session tokens use 256 bits of randomness; only token hashes are stored. Sessions expire after seven days. Password reset/change revokes previous sessions. Production uses Secure, HttpOnly, SameSite cookies and validates the exact Origin plus a custom request header for writes. HTTP-only local development has a separate cookie name. Session endpoints never expose password hashes.

Explored components accumulate. Draft answers and the current chapter persist. Clients cannot write solved labs or assessment scores through the progress endpoint. Lab completion requires server validation of the submitted evidence selections, diagnosis, and remediation. Assessment grades are computed from answers; the highest correct-answer count contributes to skill progress. Repeated successful labs do not inflate the score. Full submission details remain on the server; learners receive their own latest 50 attempt summaries.

Skill progress follows the existing course weights: six components (6 points), three successful labs (9 points), and three correct assessment answers (6 points), normalized to 100. Reading a chapter alone is not represented as skill mastery. An assessment can be retaken and scores are formative; the system does not claim that opening evidence proves it was studied or that client-visible answers are secret.

## Acceptance criteria

1. A new learner can register, enroll, and start the existing interactive course without configuration by an operator.
2. Another browser signed into the same account sees the same stored progress.
3. Another account cannot read or overwrite the first learner's record, including with crafted API requests.
4. Wrong or incomplete lab decisions do not mark a lab solved. Browser-supplied score fields do not control results.
5. Logout, session expiry, and password changes have server-enforced effects.
6. Server restart and a verified backup preserve accounts and learning records.
7. A failed save is visible and can be retried; it is never labeled synchronized.
8. Production runs as a non-root container with a read-only root filesystem and writable database volume.

## Next priorities

1. Infrastructure rollout: domain/TLS, recovery contact, scheduled off-host backups, restore drill, monitoring, and representative load tests.
2. Account lifecycle: verified email delivery, recovery tokens, account deletion/export policy, SSO/MFA if required by the deployment.
3. Teaching operations: approved course content, instructor permissions, cohorts, question pools, and broader assessment coverage.
4. Real labs: separately scoped, licensed and isolated F5 environments with ownership, quotas, expiration, evidence collection, and cleanup.
5. Broader campus: live multiuser classes, SIEM-connected scenarios and headset validation after the academy is operating.
