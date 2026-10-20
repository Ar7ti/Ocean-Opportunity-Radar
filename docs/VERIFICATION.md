# Verification — 16 October 2026

- Final unit/integration tests: 31 passed in 3 files.
- TypeScript: npx tsc --noEmit passed.
- Production build: npm run build passed (Nitro Cloudflare-module output).
- Browser: imported prepared sample claim; BRL/TRL/ranking stayed unchanged before confirmation.
- Browser: analyst recorded supporting evidence, confirmed claim; Helsinki → Redstone,
  BRL 4→5, checklist 2/4→3/4; TRL and impact remained unchanged.
- Browser: created a new company and verified selection/profile persistence after reload.
  New company had unknown TRL/BRL instead of invented baseline scores.
- Browser: Reset demo and reload restored the Baltic baseline.
- Browser: checked desktop at 1440×1000 and mobile at 390×844.
  Mobile document scroll width equalled viewport width (390).
- Fresh final browser load: no console errors. During active editing, development-server
  restarts produced transient HMR messages, cleared by full reload.
- Local POST /api/extract without a key returned the intended HTTP 503.
- Provider success/failure and quote validation tested with mocked responses.
- Real OpenAI extraction: one synthetic request on 16 October 2026 returned HTTP 200 with exact quotes; paid pilot was marked as an unverified suggestion and projected 30% nitrogen reduction was not treated as measured impact. This was a smoke test only.
- No public deployment and no claimed recommendation benchmark or time-saving result.
- Existing catalog remains three entries; complete eligibility/source audit remains future work.
- Main decision hero updated: ranking reason, open question and next action were visible together at 1280×720 in the browser. TypeScript and production build passed after this final layout edit. Mobile view after this edit remains to be checked.
- Conditional preview tests: 33 total pass; unconfirmed paid-pilot claim forecasts Helsinki → Redstone and BRL 4→5 without changing the stored/current assessment. Unmeasured forecast creates no decision unlock. TypeScript and production build pass.
- 17 October: public research endpoint and UI added. One live search for Origin by Ocean completed with clickable citations to a company page and Business Finland; this proves the search path works, not that all findings have been manually verified. Search results do not enter the scoring engine. 35 tests pass, TypeScript and production build pass. The browser research dialog was checked at desktop size. Public deployment and broader search evaluation remain open.
- Research dialog at 390px viewport: document width equals viewport width; no horizontal overflow. Temporary QA tab was closed after the check.
- Research-to-review follow-up added after user testing exposed a dead end. The live Origin by Ocean result now shows a suggested proof request, source-linked claims to review, and a copyable request draft. The research brief survives a development refresh in session storage. 36 tests pass; the live result displayed the new action without changing any score.
