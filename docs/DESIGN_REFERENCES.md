# SooVers education design references — reviewed 2026-10-11

The application is an original local prototype. These are primary product/documentation sources used for interaction and architecture patterns; this is not a systematic scientific literature review and makes no novelty claim.

| Reference | Verified pattern | SooVers application |
|---|---|---|
| ENGAGE: https://docs.engagevr.io/engage/advanced-features/drawpad-and-whiteboards | A personal drawpad can be linked to a world whiteboard. | A contextual drawing canvas updates the actual classroom texture. Ours is local, not shared. |
| VictoryXR: https://www.victoryxr.com/metaversity/ | Virtual campus environments with educational labs and simulation experiences. | Distinct navigable classrooms and practice spaces in one education floor. No VictoryXR assets are copied. |
| Virbela: https://www.virbela.com/solutions/training-and-development and https://www.virbela.com/why-virbela/virtual-spaces | Campus spaces, classrooms, presentation areas and breakout spaces. | Reception, room portals, teaching room, auditorium and separate scenario spaces. Presence/voice remain future work. |
| Educators in VR: https://educatorsinvr.wordpress.com/ | Workshops, classes and organized immersive educational events. | A guided visit and an explicit sequence for demonstration, lesson, practice and feedback. No live event is claimed. |
| Immersive: https://www.immersivelabs.com/solutions/cybersecurity-technical-exercises | Technical exercises and cyber range exercises support cyber skill practice and assessment. | A small local incident state machine with evidence, decisions and feedback. Not a running cyber range. |
| Transfr: https://support.transfrinc.com/article/train-in-the-headset-guide | Guided training, simulations and learner scoring/assessment. | Stepwise practice and a report based on actual actions in this local session. No claim of equivalent assessment validity. |

“Immersive Cyber Range” in the brief was treated as a category, with Immersive's official technical-exercise documentation as a concrete reference; it was not assumed to identify a specific metaverse product. No third-party uptime or continued commercial availability is assumed from historical feature documentation. No third-party API or service is required to run the demo.

## Architecture and extension boundary

- `components/tower/engine.ts`: existing renderer, tower geometry, input and transitions. Existing floor code is retained.
- `components/education/SpatialCampus.ts`: room scene construction, geometry, world screens, interactive surfaces, controlled GPU resource lifetime.
- `components/education/CampusExperience.tsx`: contextual object interactions and presentation controls. There is no separate educational dashboard route.
- `lib/education/model.ts`: room catalog, demo navigation permissions, exercise state and scoring, basic collision calculation.
- `lib/education/contracts.ts`: proposed interfaces for verified identity, presence and isolated lab backends. No provider or credentials are active.

A future server must issue verified roles and enforce authorization independently of all browser values. A future lab adapter should normalize events from isolated infrastructure into TrainingEvent; a Splunk integration should run through an authenticated backend without privileged browser tokens. Voice, instructor authority, shared boards, persistent assessment and AI need their own authenticated session services. Existing exterior and unrelated floors do not depend on these future services.
