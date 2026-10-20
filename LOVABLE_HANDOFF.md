# Detailed prompt for the next Lovable iteration

Continue this existing TanStack Start / React / TypeScript / Tailwind project. The goal
is the strongest practical solo submission for the A’Pelago / Redstone Ocean Opportunity
Radar challenge within the remaining hackathon time. Inspect current files before editing.

## Product
The user is a fund or accelerator analyst screening blue economy startups. The product
shows which next action is justified and which evidence to request next.
Its core chain is source-backed fact → explicit criterion → opportunity → obstacle →
concrete next action. New confirmed evidence must visibly change the right decision.
Keep the light design, ocean teal accents, readable typography, one dominant decision
hero and restrained transitions. Details and sources remain accessible below it.

## Already implemented
Three fictional demo startups, custom local startup profiles, curated official catalog,
before/after hero, fact forms with sources/dates/TRL/impact fields, AI text intake with
literal quotes, unconfirmed claims, a separate supporting-evidence field before confirming
imported claims, server-only Responses API integration, schema/quote checks, missing-key
errors, timeouts/request limits, labelled sample walkthrough, explainable ranking and reset.

Never silently replace an AI failure with sample output. Never present sample output as
AI output. OPENAI_API_KEY stays server-side. A source quote establishes what the source
says; the analyst still verifies the underlying claim.

## Priority 1: verify the real browser flow
On Baltic Nutriloop, import the prepared paid-pilot sample. Scores stay unchanged while
unconfirmed. Inspect the fictional supporting agreement, record evidence checked,
confirm manually, then show:
- Helsinki Studio → Redstone priority change.
- BRL 4→5; internal investor checklist 2/4→3/4.
- TRL 6 and measured impact status unchanged.
- Exact causing claim, quote, checked evidence, ranking rule and next action.

Test KelpForm with a confirmed technical test and analyst-selected TRL. Show technology
and requirement changes even if the top recommendation stays the same. Test reset,
reload, switching profiles, new startup creation and editing. Fix observed failures.

## Priority 2: analyst efficiency
Make paste → claim review → supporting-evidence review → confirmation → next action
require minimal typing. Offer a copyable draft requesting the two most useful missing
pieces of evidence. Derive the questions from real missing checks and stored conditions.
Sending emails/messages is outside this iteration.

Preserve negatives and uncertainty. Future/free pilots are not paid traction.
Forecast pollution reduction is not measured impact. The model may suggest a type;
it must never choose or confirm TRL or independently declare evidence verified.

## Priority 3: official opportunity catalog
Target 15 verified entries if time permits: accelerators, investors, grants and published
pilot programmes. Each needs official URL, checked date, type, focus, geography, stage,
availability, known deadlines and attributable requirements/preferences.
Do not add fabricated entries to reach a count. Start from:
- https://www.apelago.fi/helsinki-blue-economy-studio/
- https://redstone.vc/strategies/blue-economy
- https://eic.ec.europa.eu/eic-funding-opportunities/eic-accelerator_en

Read official sources. Keep unknown information unknown. Separate programme status
from profile fit. Closed programmes never say apply now. Distinguish published admission
requirements, published preferences, investment thesis and our analyst preferences.
Paid traction is OUR Redstone prioritization rule, not a published Redstone requirement.
Passing stored conditions is an initial screen, not full funding eligibility.

## Priority 4: explainability and strategy fit
Keep visible rule weights and separate hard checks from ranking. Missing evidence is
unknown, not a negative fact. Avoid artificial precision and model confidence percentages.
Only after core-flow/catalog quality is proven, consider a simple strategy selector for
pilot validation vs investment preparation with explicit visible rule changes.

BRL is the prototype's simplified internal estimate. Investor readiness is its own
checklist. TRL needs analyst-reviewed evidence. Ocean Impact Navigator is a KPI framework,
not an official 1–9 readiness scale.

## Priority 5: submission demo
The main story should be understandable in 30 seconds. On a laptop, make the changed
recommendation, causing evidence, key metric changes and next action easy to read.
Mobile must not overflow horizontally. Include keyboard support and clear loading,
empty/error/success states. Prepare a three-minute pitch and honest fallback walkthrough.

## Scope and architecture
Stay on the current stack and dependencies. Browser storage is local, not a shared
database. A public founder submission queue requires server storage/access controls
and a separate scope decision. Avoid login, CRM, crawling, complex PDF parsing and
email sending until the essential demo and official data are strong.

Production AI needs server secrets and suitable request limits; the current in-memory
per-instance cap is not durable public abuse control. Do not claim live testing or
deployment until it happened.

## Required quality gates
Run meaningful tests, TypeScript and production build, then exercise the actual browser.
Check unsupported/unconfirmed claims cannot improve scores, fabricated quotes are
rejected, forecasts are not measured impact, paid pilots do not increase TRL/impact,
technical evidence changes only supported checks, closed/excluded opportunities never
say apply now, and sources/verification evidence survive reload.

Compare five representative cases with manual analyst review and a plain ChatGPT
prompt using identical evidence/catalog. Report observed results and limits. Do not
invent benchmark wins or measured time savings.

Report completed work, actual checks, remaining limits and the next highest-value task.
Preserve the current app and work in this order.
