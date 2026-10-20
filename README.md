# Ocean Opportunity Radar

Evidence-led workspace for fund and accelerator analysts. Based on Lovable v7, extended locally.

## Run
Node.js 22+ recommended.

    npm ci
    npm run dev -- --host 127.0.0.1 --port 43189

Open http://127.0.0.1:43189/ . Profiles/facts are saved in this browser.
Three built-in startups and their evidence are fictional. Additional profiles are analyst-entered.

## Live AI
Copy .env.example to .env.local, set OPENAI_API_KEY there, then restart the dev server.
Never put a secret in a VITE_ variable or browser field. Default model: gpt-6.1-sol (low reasoning effort).
Production hosting needs these values as server secrets.

POST /api/extract uses the Responses API, strict JSON schema, store:false, timeout,
same-origin checks, input limits and a per-instance request cap. Exact quotes must
occur in the submitted text. Quote grounding does not establish factual truth.
All suggestions start unconfirmed. The analyst must describe supporting evidence
inspected before confirming imported claims. AI does not score, choose TRL or invent opportunities.

POST /api/research uses OpenAI web search to investigate a real startup by name and
optional website. It returns a short brief with clickable citations and a source list.
The brief is a research lead only: it does not create confirmed facts or change scores.
The result highlights a suggested proof request, offers a copyable draft, and lets the
analyst move a cited public finding into the evidence review form as an unconfirmed
claim. Recent research is kept in this browser tab during development refreshes.
The endpoint has same-origin and input checks plus a small in-memory request cap.

Without a key, live AI reports a configuration error. The sample walkthrough is
prepared fictional data, explicitly labelled as no AI call. Live provider extraction was tested once on 16 October 2026 with synthetic text: HTTP 200, exact quotes, paid pilot classified as unverified, and projected impact kept unmeasured. This is one smoke test, not a reliability benchmark.

Before public AI access, add durable rate limiting/access controls: the current
in-memory cap resets on restart and is separate for each server instance.

Official implementation references:
- https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses
- https://developers.openai.com/api/docs/models/gpt-6.1-sol
- https://developers.openai.com/api/docs/guides/tools-web-search

## Demo
1. Baltic Nutriloop → Reset demo if needed.
2. Read pitch with AI → Sample walkthrough. Explain it is a prepared fictional example.
3. Save the selected paid-pilot claim. Scores remain unchanged.
4. Review next claim. Inspect the quote and evidence request. For this synthetic
   walkthrough enter “Signed paid pilot agreement — fictional evidence checked for demo”
   as supporting evidence, tick analyst confirmation and save.
5. Show Helsinki → Redstone, BRL 4→5, checklist 2/4→3/4, unchanged TRL and impact.
6. Open the fact and official source. Paying-customer preference is our rule, not Redstone's.
7. Reset and reload to repeat.

For real startups, choose Research online to find public leads before reviewing a pitch.
The built-in demonstration startups are fictional and should not be searched as if real.

## Checks
    npm test
    npx tsc --noEmit
    npm run build

## Deployment and limits
The inherited build produces Nitro Cloudflare-module output. Use the existing Lovable
deployment workflow or a compatible server host. Static hosting cannot run the AI endpoint.
This version is local and has not been publicly deployed.
The catalog has three official entries with a subset of conditions, not full eligibility
evaluations. Recheck official terms/deadlines. BRL is a simplified internal estimate;
investor readiness is our own checklist. Impact is evidence of measurement, not an
official 1–9 readiness scale.

See LOVABLE_HANDOFF.md for the detailed next development prompt.
