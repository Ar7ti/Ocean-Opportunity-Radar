// Shared opportunity catalog. Every condition here is copied from the linked
// official page on the "checked" date. Anything the page does not state stays
// "unknown" — never fill in deadlines, amounts or eligibility rules.

export type OppStatus = "open" | "rolling" | "closed" | "unknown";

export type Requirement =
  | { kind: "geography"; label: string; countries: string[]; outside: "not_met" | "unknown"; quote: string }
  | { kind: "min_trl"; label: string; min: number; quote: string }
  | { kind: "stage"; label: string; stages: string[]; quote: string }
  | { kind: "attend_helsinki"; label: string; quote: string } // onsite participation required
  | { kind: "unknown"; label: string; quote: string }; // eligibility info not published

/** What kind of opportunity this is — drives the wording of the next action. */
export type OppKind = "accelerator" | "investor" | "grant";

export type CatalogOpp = {
  id: string;
  name: string;
  type: string;
  kind: OppKind;
  focusAreas: string[]; // "Any" = open to any field
  geography: string;
  stage: string;
  status: OppStatus;
  statusNote: string;
  deadline: string | null; // ISO date, null = unknown / none
  sourceUrl: string;
  checkedDate: string;
  hardRequirements: Requirement[]; // published by the source
  publishedPreferences: string[]; // published, but "ideally", not mandatory
  publishedTerms: string[];
  analystPreferences: { label: string; needs: "paid_pilot" }[]; // ours, not the source's
  supportsPiloting: boolean; // published support for validating/piloting
  investor: boolean;
};

export const EU_MEMBER_STATES = [
  "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czechia", "Denmark", "Estonia", "Finland", "France",
  "Germany", "Greece", "Hungary", "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta", "Netherlands",
  "Poland", "Portugal", "Romania", "Slovakia", "Slovenia", "Spain", "Sweden",
];

export const CATALOG: CatalogOpp[] = [
  {
    id: "helsinki-bes",
    name: "Helsinki Blue Economy Studio",
    type: "Accelerator programme (A'Pelago)",
    kind: "accelerator",
    focusAreas: ["Blue economy"],
    geography: "Applications accepted from around the world; onsite participation in Helsinki required (official FAQ)",
    stage: "Growth teams building blue economy solutions",
    status: "open",
    statusNote: "Application period open; programme spring 2027, Demo Day August 2027",
    deadline: "2026-11-30",
    sourceUrl: "https://www.apelago.fi/helsinki-blue-economy-studio/",
    checkedDate: "2026-10-16",
    hardRequirements: [
      {
        kind: "attend_helsinki",
        label: "Can attend the programme onsite in Helsinki",
        quote: "Official FAQ: applications are accepted from around the world; onsite participation in Helsinki is required",
      },
    ],
    publishedPreferences: ["“ideally with an MVP already in the market”"],
    publishedTerms: ["Equity-free", "Three company-specific coaching sessions"],
    analystPreferences: [],
    supportsPiloting: true,
    investor: false,
  },
  {
    id: "redstone-blue",
    name: "Redstone Blue Economy",
    type: "Venture capital strategy",
    kind: "investor",
    focusAreas: [
      "Sustainable Maritime & Port Technology",
      "Ocean Infrastructure & Clean Energy",
      "Marine Intelligence",
      "Blue Biotech & Water Innovation",
    ],
    geography: "unknown — no geography requirement stated (page mentions a Nordic and European network)",
    stage: "Pre-Seed to Series A",
    status: "unknown",
    statusNote: "No application process, contact route or deadline published on this page",
    deadline: null,
    sourceUrl: "https://redstone.vc/strategies/blue-economy",
    checkedDate: "2026-10-16",
    hardRequirements: [
      { kind: "stage", label: "Investment stage", stages: ["Pre-seed", "Seed", "Series A"], quote: "“Stage: Pre-Seed to Series A”" },
    ],
    publishedPreferences: [],
    publishedTerms: ["Initial ticket size EUR 200k to 2.0m (as published)"],
    analystPreferences: [
      { label: "Confirmed paying customer before an investor intro", needs: "paid_pilot" },
    ],
    supportsPiloting: false,
    investor: true,
  },
  {
    id: "eic-accelerator",
    name: "EIC Accelerator",
    type: "EU funding (grant and/or equity)",
    kind: "grant",
    focusAreas: ["Any"],
    geography: "EU Member States and Horizon Europe associated countries",
    stage: "Startups and SMEs; innovation activities at TRL 6–8",
    status: "rolling",
    statusNote: "Short proposals any time; full proposals only after a GO, at 2026 batch dates (next listed: 4 Nov 2026)",
    deadline: null,
    sourceUrl: "https://eic.ec.europa.eu/eic-funding-opportunities/eic-accelerator_en",
    checkedDate: "2026-10-16",
    hardRequirements: [
      {
        kind: "geography",
        label: "Established in an EU Member State or associated country",
        // Associated-country list not stored here: other countries stay "unknown".
        countries: [...EU_MEMBER_STATES, "Norway", "Iceland"],
        outside: "unknown",
        quote: "“Applicants from EU Member States and countries associated to the Horizon Europe programme”",
      },
      { kind: "min_trl", label: "Innovation at TRL 6 or higher", min: 6, quote: "“innovation activities (TRL 6-8)”" },
    ],
    publishedPreferences: [],
    publishedTerms: ["Grant and equity terms: see official source"],
    analystPreferences: [],
    supportsPiloting: false,
    investor: false,
  },
];
