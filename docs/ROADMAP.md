# Ocean Opportunity Radar — current plan (16 October 2026)

## Honest status

The main evidence-to-decision demonstration is about 80% ready. The full hackathon submission is roughly 45–50% ready. These are planning estimates, not measured quality scores. The core logic and light interface work; the opportunity catalog, complete browser walkthrough, public deployment and pitch are still incomplete.

## Already working

- Three fictional demo startups; local custom profiles with unknown readiness until evidence exists.
- Three real opportunities linked to official source pages, with a partial set of conditions.
- Rules for TRL, simplified internal BRL, investor checklist and measured ocean impact.
- Source-backed facts, analyst confirmation, browser persistence, explainable ranking and before/after comparison.
- Live OpenAI extraction with exact source quotes. One synthetic HTTP 200 smoke test completed; all suggestions remain unconfirmed.
- One-click public startup research by name with visible source links and a separate lead status. One live search worked for a real company; sources still need analyst review.
- Conditional evidence preview: an unconfirmed claim can show what would change if independently verified, while the current assessment stays unchanged. The Redstone paid-customer preference is marked as our rule.
- The Baltic demo can change priority from Helsinki Blue Economy Studio to Redstone after a paid pilot is confirmed. BRL changes 4→5 and checklist 2/4→3/4; TRL and ocean impact stay unchanged.
- 33 automated tests, type check and production build passed after the conditional preview was added. Browser checked at 1280×720: ranking rule, open question and next action are visible together. Earlier 1440px desktop and 390px mobile checks preceded this update.

## Work in order

| Priority | Work | Time estimate | Done when |
| --- | --- | ---: | --- |
| 1 | Rehearse the full AI→hypothetical preview→evidence review→actual decision path in the browser and tighten its wording | 1–2 h | A new viewer can explain the change in 15 seconds; no unsupported claim changes the current score |
| 2 | Verify and enter 15 real opportunities from official pages, including status, date checked, link and only published terms | 6–8 h | Every visible real opportunity has traceable current source data; unknowns remain unknown |
| 3 | Shorten analyst review and generate a copyable request for the most useful missing evidence | 3–4 h | Analyst can review a claim and know exactly what document to request next |
| 4 | Compare five cases with manual judgement and plain ChatGPT on identical evidence; fix misleading matches | 3–4 h | No critical false eligibility or measured-impact claim in the five cases |
| 5 | Deploy a public version with server-held key and durable request protection, then verify it from a clean browser | 3–5 h | Public URL works without local files or developer setup |
| 6 | Prepare a three-minute pitch, fallback demo and submission material | 2–3 h | The live change and its source can be shown reliably in three minutes |

Keep several hours of buffer for broken data sources, deployment problems and a final rehearsal. Defer founder accounts, CRM, scraping, PDF pipelines and email sending until after submission.

## Submission gate

1. A new viewer sees what changed and why within 15 seconds.
2. One complete live browser flow works from text input through analyst review to a justified next action.
3. Fifteen real opportunities have official links, checked dates and honest availability labels.
4. Five representative cases have been compared with manual screening and a baseline ChatGPT prompt, with failures documented.
5. Public URL, short pitch and fallback walkthrough are ready.
