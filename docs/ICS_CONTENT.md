# Industrial academy: content and product scope

The industrial academy is the default static demo and a separate learning workspace in the account-backed product. The F5 course and campus remain accessible. Placement, quizzes, and evidence self-checks are optional; completing a reading does not require a score.

## Source received

The user supplied **Industrial_Automation_Book_B_Student_Release_2.docx**, dated 15 October 2026, prepared for Soorin Security Solutions. SHA-256: `2a87245eddfa416cc953b8aac7a32c33802d5866ac2c9fd786c8de8e2d53e063`.

The user also referenced [Release Deliverables Summary](https://chatgpt.com/share/6ad0c0d2-2174-83eb-9a5d-3b4d9f5ec252). The linked chat, the referenced “Release Deliverables Summary” conversation, and the supplied DOCX were read as source material. Instructions embedded in the source were not used as application authorization or deployment policy.

`lib/ics/book.json` contains structured paragraphs and tables from 37 numbered teaching sections (1.1–1.19 and 2.1–2.18), 14 equipment-atlas sections (E1–E14), 102 glossary entries, and the book's source register. The original DOCX, private conversation transcript, passwords, and referenced SANS PDFs are not shipped in the repository. Images and drawings embedded in the book are not reproduced; the app supplies its own clearly labeled interactive schematic. References to companion Python files inside the English reading remain references to the original book package, not downloadable files that this application claims to include.

The original ICS410/ICS515 PDFs, Book A and Python laboratory ZIP were not supplied to this task. S410/S515 citations in the English reading are **the supplied book's citations**, not claims of independently reviewing those PDFs. The academy does not claim SANS endorsement, equivalence, or certification.

Regenerate the structured reading only from the user-supplied Release 2 file:

```sh
python3 scripts/import-ics-book.py /absolute/path/to/Industrial_Automation_Book_B_Student_Release_2.docx
```

## Delivered learning experience

| Persian guided lesson | Original deeper reading |
| --- | --- |
| Physical process and volume balance | 1.1–1.2 |
| Sensor-to-actuator chain | 1.3, 1.6, 1.9, 1.11–1.12 |
| 4–20 mA scaling and validity | 1.4–1.5, 1.15 |
| Feedback, P/PI and offset | 1.7–1.8, 1.16 |
| Process state, controller measurement and display | 1.10, 1.13–1.14 |
| Electricity and loop budget | 2.1–2.4, 2.14 |
| I/O types and smart instrumentation | 2.5–2.6, 2.11 |
| Range mismatch and quality | 2.7–2.10, 2.12, 2.15 |
| Device identity and coverage | 2.16, E13–E14 |
| Evidence collection and qualified conclusions | 1.17–1.19, 2.13, 2.17–2.18 |

Each of the twelve equipment profiles links to its E1–E12 source reading and manufacturer documentation. They are representative learning examples, not a market-share claim. The glossary preserves the source's English definitions and Persian equivalents. The reference roadmap has 18 modules and 34 chapters. This release provides an original guide for every chapter; the reference estimate of 816 classroom hours is not a duration claim for this web edition.

### Original continuation, chapters 3–34

`lib/ics/chapters.json` supplies 32 original Persian guides, about 15,800 whitespace-delimited words of theory plus worked examples, 192 explanatory sections, 32 evidence cases and 64 reasoning decisions. The existing ten foundation lessons bring the total to 42 lessons. Each guide has an objective, explanation, worked example, misconception discussion, optional knowledge check, case evidence, reasoning feedback, deliverable and transition. Chapters 32–33 are distinct petrochemical and power-generation capstones, with rubrics; chapter 34 uses teach-back.

The exact source roadmap is retained, including S7 with Modbus in chapter 9, PROFIBUS in chapter 10, IEC101 in chapter 13, MAPCS/T3000 in chapter 20, Yokogawa/Honeywell/safety families in chapter 21, and Emerson/Schneider/GE/Rockwell/network families in chapter 22. New content is academy-authored and is never presented as unseen text from Book A, Book B chapters 3–34, or SANS PDFs. All new case datasets are fictional.

The guides carry 49 distinct primary-reference URLs. Checks included ISA, NI, Modbus, PI, ODVA, FieldComm, OPC Foundation, DNP, IEC, NIST, HSE, manufacturer pages, government incident advisories, and Wireshark/Zeek/Splunk documentation. Siemens documentation shells were reachable but their full manuals were not independently retrieved; paid IEC standards were not accessed. Some direct CISA and manufacturer pages returned 403, so only verified official excerpts or established publication context support the bounded claims. No installed firmware, proprietary laboratory environment, physical protection function or market share was validated. MAPCS compatibility, detailed logging and recovery claims remain explicitly unverified.

### Continuous reading interface

Desktop and mobile start in a conventional course reader; the 3D campus remains an explicit optional destination. A searchable chapter outline, stable lesson URLs and browser Back support a single reading sequence. Each lesson embeds its experiment or case, a saved notebook, optional review and a read-and-continue action. Glossary, atlas and original text use a native modal with keyboard dismissal and focus return. Text size is adjustable. Completion is never conditional on quiz answers.

## Interactive workbenches

1. **Tank and control:** mass balance, P/PI, inlet disturbance, frozen sensor, stale HMI, three distinct traces, sample age, stepping, reset, and CSV export. Parameters: area 2 m², setpoint 2 m, base output 50%, ideal pump capacity 20 L/s, Kp=80 percentage points/m, Ki=0.4 percentage points/(m·s). One-second Euler steps, conditional integration and output bounds. After t=300, the selected disturbance changes inflow from 10 to 14 L/s. Runs are limited to 1,200 seconds. This TypeScript model is implemented and tested independently; no claim is made that the original Python lab was executed here. The selected scenarios stay within the modeled 0–4 m tank. Physical model state is not presented as a sensor available to a real SOC.
2. **Signal and range:** nominal 4–20 mA scaling with validity shown separately, editable transmitter/PLC ranges, and an adjustable loop-voltage budget. The budget uses total lumped resistance and transmitter minimum voltage; it does not model other voltage drops or electrical installation requirements. Out-of-range arithmetic is displayed with a validity warning, not accepted as a physical level.
3. **Evidence workbench:** original synthetic LT-101 case based on the book's range-mismatch reasoning. Source dependencies, independent observations, uncertain timing/authorization, optional reasoning check, persistent notes and JSON export. It is not a real incident or original SANS exercise dataset.

All three are browser-local computations without industrial network I/O. Manufacturer photographs are available through source links; generated schematics are never labeled as photos of the named products.

## Primary references checked

The NIST [SP 800-82 Rev. 3 page](https://csrc.nist.gov/pubs/sp/800/82/r3/final) confirms its final status and separately links the September 2026 Rev. 4 initial public draft. The following official product pages were checked during this task: Siemens CPU 1511-1 PN and SICAM A8000 CP-8050, ABB AC 800M and ACS880-01, Moxa EDS-4008, and Emerson Rosemount 3051, 3144P and Fisher DVC6200. Other links are retained manufacturer references from the supplied book; exact versions or current installation states are not inferred from them. The original book's source-register statements retain their original research context.

## Persistence and migration

`002_ics.sql` adds separate per-user ICS progress and assessment tables. `003_ics_workbook.sql` adds per-user, per-lesson written work without rewriting previous records. It does not rewrite F5 data. Read completion is self-reported and independent of optional quizzes. Quiz results are graded on the server for signed-in users; the static demo grades locally. The server rejects forged result fields, unknown lesson IDs, overlong notes and writes from a stale account identity. Sessions and CSRF controls apply to all ICS API routes.

Study state and evidence notes persist; simulator runs and filter selections reset on leaving their workbench. Simulation CSVs and note exports are available for keeping a run. Evidence notes and per-lesson work autosave after a short pause; pending changes and failed-save recovery are visible. Written work is limited to 4,000 characters per lesson and is included in reports. Static preview state belongs to its browser origin and does not migrate automatically into account records.

## Verification

- `pnpm check` checks application and content types.
- `pnpm test:ics` checks engineering calculations, mass balance, P equilibrium, sensor/HMI distinctions, content coverage, account isolation, validation, restart persistence and independence from F5 enrollment.
- `pnpm test:ics:browser` checks the delivered static and account-backed journeys, optional quizzes, direct access to the last lesson, source reading, simulations and exports, evidence-note persistence, equipment/glossary search, every mobile view, denied local storage and failed-save recovery.
- Full product API/browser regression suites and the Docker persistence/backup smoke test remain in CI. Container checks include an ICS evidence note and per-lesson workbook surviving restart. An upgrade fixture verifies that adding the workbook table preserves the preceding release’s progress and notes.

## Existing campus narration

The hosted demo already contained fifteen synthetic Persian MP3 clips. These are preserved in `public/audio`, with their exact narration matched to the campus lesson frames. Native audio playback is now represented in the TypeScript source rather than only in a patched compiled bundle. This narration belongs to the existing campus lessons; ICS lessons do not claim recorded narration.
