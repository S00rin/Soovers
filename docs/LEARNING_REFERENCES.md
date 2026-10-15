# Learning and lab sources

Reviewed for the 0.4 implementation on 2026-10-11. The cloud egress policy refused direct access to documentation domains. The publicly maintained source repositories below were read through the existing GitHub route. No TLS or package verification was disabled. Publisher book links remain catalog references; the lessons do not claim to reproduce copyrighted books.

| Source inspected | Applied to SooVers |
|---|---|
| [pfSense rule basics](https://github.com/pfsense/docs/blob/master/source/firewall/firewall-rule-basics.rst) and [processing order](https://github.com/pfsense/docs/blob/master/source/firewall/firewall-rule-processing-order.rst), repository commit `74ca3ce0d8844cb925399ccbe674504c6562fb1d` | Stateful connection example; first matching interface rule. The teaching model omits NAT and floating-rule complexities. Functional appliance layers do not represent a manufacturer's circuit board. |
| [Suricata EVE](https://github.com/OISF/suricata/blob/master/doc/userguide/output/eve/eve-json-output.rst) and [introduction](https://github.com/OISF/suricata/blob/master/doc/userguide/what-is-suricata.rst) | JSON alert/flow metadata and passive IDS versus inline IPS. The demo shows a passive sensor; an alert does not block packets. |
| [MITRE Enterprise ATT&CK STIX](https://github.com/mitre/cti/tree/master/enterprise-attack) | T1566.001, T1059.001, T1003, T1021.001 and T1041 names and behavior verified against non-revoked, non-deprecated objects. The scenario ordering and synthetic evidence are original teaching material. |
| [Splunk Attack Range](https://github.com/splunk/attack_range/tree/develop) README, “What it does” | Separation of lab provisioning, behavior execution and telemetry forwarded to a SIEM informed the future provider boundary. No range was provisioned and no Splunk integration is claimed. |
| [Caldera](https://github.com/mitre/caldera) README | ATT&CK-based behavior modules and reporting informed the station-by-station mission. No C2, agents or attack automation are installed in the demo. |

`lib/education/resources.ts` contains original Persian summaries and links shown in the library. `public/docs/learning-notes-fa.md` is an offline reading copy. The initial books/NotebookLM catalog remains in `lib/tower-data.ts` and keeps existing stored links.

The earlier immersive-campus references are retained in `DESIGN_REFERENCES.md` as historical project research. This implementation does not make a “first in the world” or photorealism claim.
