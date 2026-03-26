export const Authority = Object.freeze({
  Statute: "statute",
  Regulation: "regulation",
  FinalGuidance: "final_guidance",
  DraftGuidance: "draft_guidance",
  Standard: "standard",
  BestPractice: "best_practice",
  InternalPolicy: "internal_policy",
});

export const Binding = Object.freeze({
  Mandatory: "mandatory",
  Strong: "strong",
  Recommended: "recommended",
  Advisory: "advisory",
});

export const PCCPElig = Object.freeze({
  Typical: "TYPICAL", No: "NO", Conditional: "CONDITIONAL", Unlikely: "UNLIKELY", Exempt: "EXEMPT",
});

const _docModules: Record<string, any> = {
  baseQMS: [
    { doc: "QMS change control record", source: "ISO 13485:2016 §7.3.9 (QMSR)" },
  ],
  riskAssessment: [
    { doc: "Updated risk analysis", source: "ISO 14971:2019" },
  ],
  riskAssessmentNoImpact: [
    { doc: "Risk assessment confirming no impact on safety or effectiveness", source: "ISO 14971:2019 §7" },
  ],
  configMgmt: [
    { doc: "Configuration management record update", source: "IEC 62304 §8.1.2" },
  ],
  cyberDevice: [
    { doc: "Software Bill of Materials (SBOM) update (required for cyber devices per §524B)", source: "FDA-CYBER-2026 §V; FD&C Act §524B(b)(3)" },
  ],
  cyberDeviceFull: [
    { doc: "Software Bill of Materials (SBOM) (required for cyber devices per §524B)", source: "FDA-CYBER-2026 §V; FD&C Act §524B(b)(3)" },
    { doc: "Cybersecurity documentation", source: "FDA-CYBER-2026" },
  ],
  swDocs: [
    { doc: "Software documentation per IEC 62304", source: "IEC 62304" },
  ],
  modelCardRecommended: [
    { doc: "Model card / Algorithm Change Protocol (recommended per draft guidance — verify finalization status at fda.gov)", source: "FDA-LIFECYCLE-2025 §V.D" },
  ],
  modelCardTransparencyRecommended: [
    { doc: "Model card / transparency documentation update (recommended per draft guidance — verify finalization status at fda.gov)", source: "FDA-LIFECYCLE-2025 §V.D" },
  ],
  biasRecommended: [
    { doc: "Bias / equity assessment (recommended per draft guidance — verify finalization status at fda.gov)", source: "FDA-LIFECYCLE-2025 §IV.B" },
  ],
  pccpFutureRecommended510k: [
    { doc: "PCCP for future changes — strongly recommended if device does not yet have an authorized PCCP. Including a PCCP in this submission enables future similar changes without additional submissions. See the Marketing Submission Recommendations for a PCCP for AI-Enabled Device Software Functions Guidance (Dec 2024, reissued Aug 2025), Sections V–VIII for policy and content requirements.", source: "FDA-PCCP-2025" },
  ],
  pccpFutureRecommendedPMA: [
    { doc: "PCCP for future changes — strongly recommended if device does not yet have an authorized PCCP. Including a PCCP in this PMA supplement enables future similar changes to be implemented without additional supplements. See the Marketing Submission Recommendations for a PCCP for AI-Enabled Device Software Functions Guidance (Dec 2024, reissued Aug 2025), Sections V–VIII.", source: "FDA-PCCP-2025" },
  ],
  pccpDocs: [
    { doc: "PCCP scope verification record (change type, boundaries, protocol match)", source: "FDA-PCCP-2025 §V–VI" },
    { doc: "Validation report per PCCP-specified acceptance criteria", source: "FDA-PCCP-2025 §VII" },
    { doc: "Pass/fail documentation for each acceptance criterion", source: "FDA-PCCP-2025 §VII" },
    { doc: "Labeling review and update — review labeling for any updates required by the authorized PCCP, applicable regulations, or FDA conditions of authorization; include PCCP-related labeling statements where required or specified", source: "FDA-PCCP-2025 §V.C; §IX" },
    { doc: "PCCP implementation reporting update (PMA: Annual Report per 21 CFR 814.84; 510(k)/De Novo: per QMS)", source: "FDA-PCCP-2025 §V.C" },
  ],
};

export const docRequirements: Record<string, any> = {
  "Letter to File": {
    required: [
      { doc: "Letter to File with change description, rationale, and regulatory basis", source: "QMSR; internal change-control records" },
      ..._docModules.riskAssessmentNoImpact,
      ..._docModules.configMgmt,
      ..._docModules.baseQMS,
      ..._docModules.cyberDevice,
    ],
    recommended: [
      ..._docModules.modelCardTransparencyRecommended,
    ],
    orgSpecific: [
      { doc: "Performance comparison summary (pre/post change)", source: "Organization policy" },
      { doc: "Subgroup analysis of affected populations", source: "Organization policy" },
    ],
    basis: "Deciding When to Submit a 510(k) for a Software Change to an Existing Device (Oct 2017) — Cybersecurity/Restore-to-Spec exemptions or all significance questions NO; QMSR; internal change-control records; Quality Management System Regulation (QMSR, incorporating ISO 13485:2016)",
  },
  "Implement Under Authorized PCCP": {
    required: [
      ..._docModules.pccpDocs,
      ..._docModules.baseQMS,
      { doc: "Risk management file update", source: "ISO 14971:2019" },
      ..._docModules.cyberDevice,
    ],
    recommended: [
      ..._docModules.biasRecommended,
      { doc: "Post-deployment performance monitoring plan activation", source: "FDA-PCCP-2025 §VII" },
      { doc: "Subgroup analysis report (recommended per draft guidance — verify finalization status at fda.gov)", source: "FDA-LIFECYCLE-2025 §V.B" },
      { doc: "Real-world performance monitoring plan (TPLC approach; recommended per draft guidance — verify finalization status at fda.gov)", source: "FDA-LIFECYCLE-2025 §VI" },
    ],
    orgSpecific: [
      { doc: "Independent verification of PCCP boundary compliance (by a reviewer not involved in the change)", source: "Organization policy" },
      { doc: "Cumulative PCCP implementation log with running impact assessment", source: "Organization policy" },
    ],
    basis: "Marketing Submission Recommendations for a PCCP for AI-Enabled Device Software Functions (Dec 2024, reissued Aug 2025) §V–VIII; Quality Management System Regulation (QMSR, incorporating ISO 13485:2016 §7.3.9)",
  },
  "New Submission Required": {
    required: [
      { doc: "Updated substantial equivalence argument (predicate comparison)", source: "21 CFR 807.87; 21 CFR 807.92" },
      { doc: "Updated device description", source: "21 CFR 807.87(e)" },
      { doc: "Performance testing report (pre/post change comparison)", source: "FDA-SW-510K-2017 Q4" },
      ..._docModules.swDocs,
      ..._docModules.riskAssessment,
      { doc: "Updated labeling", source: "21 CFR 807.87(e)" },
      { doc: "Submission package in required format (eSTAR for 510(k); De Novo Request format per FDA guidance)", source: "FDA eSTAR guidance; FDA De Novo guidance" },
      ..._docModules.cyberDeviceFull,
    ],
    recommended: [
      ..._docModules.modelCardRecommended,
      ..._docModules.biasRecommended,
      { doc: "Pre-Submission (Q-Sub) meeting with FDA", source: "FDA Q-Sub Guidance" },
      { doc: "Clinical evidence sufficiency assessment", source: "Best practice" },
      ..._docModules.pccpFutureRecommended510k,
      { doc: "Real-world performance monitoring plan (recommended per draft guidance — verify finalization status at fda.gov)", source: "FDA-LIFECYCLE-2025 §VI" },
    ],
    orgSpecific: [
      { doc: "Clinical evidence sufficiency assessment", source: "Organization policy" },
      { doc: "Peer review of substantial equivalence argument by independent RA professional", source: "Organization policy" },
    ],
    basis: "21 CFR 807.81(a)(3); Deciding When to Submit a 510(k) for a Software Change to an Existing Device (Oct 2017)",
  },
  "PMA Supplement Required": {
    required: [
      { doc: "PMA supplement type determination", source: "21 CFR 814.39(a)–(e)" },
      { doc: "Updated device description", source: "21 CFR 814.39" },
      { doc: "Clinical data (per supplement type requirements)", source: "21 CFR 814.39" },
      ..._docModules.riskAssessment,
      { doc: "Performance testing report", source: "21 CFR 814.39" },
      ..._docModules.swDocs,
      { doc: "Updated labeling", source: "21 CFR 814.39(c)" },
      ..._docModules.cyberDeviceFull,
    ],
    recommended: [
      ..._docModules.modelCardRecommended,
      ..._docModules.biasRecommended,
      { doc: "Pre-Submission (Q-Sub) meeting with FDA", source: "FDA Q-Sub Guidance" },
      ..._docModules.pccpFutureRecommendedPMA,
      { doc: "Post-market surveillance plan update", source: "21 CFR 814.82" },
    ],
    orgSpecific: [
      { doc: "Independent clinical review of supplement type determination", source: "Organization policy" },
      { doc: "Advisory committee preparation materials (for Panel-Track supplements)", source: "Organization policy" },
    ],
    basis: "21 CFR 814.39; PMA Supplement Guidance",
    scopeNote: "Scope limitation: RegAccess identifies that a PMA supplement is required but does not route to supplement-type-specific documentation requirements. The specific supplement type (Panel-Track, 180-Day, Real-Time, Special, 30-Day, or 30-Day Notice) — selected in question C_PMA4 — determines the actual submission format, clinical data requirements, and review timeline. Consult 21 CFR 814.39(a)–(f) and your PMA approval order for supplement-type-specific requirements.",
  },
  "Assessment Incomplete": {
    required: [
      { doc: "Document the specific unresolved questions and the reason each could not be answered", source: "Internal change-control records" },
      { doc: "Record the current assessment state and all answers provided so far", source: "QMSR; internal change-control records" },
    ],
    recommended: [
      { doc: "Pre-Submission (Q-Sub) meeting request with FDA to resolve unresolved questions", source: "FDA Q-Sub Guidance" },
      { doc: "Senior RA / clinical expert review of the unresolved areas before re-assessment", source: "Best practice" },
      { doc: "Risk analysis of the change under the assumption of the most conservative answer to each unresolved question", source: "ISO 14971:2019" },
    ],
    orgSpecific: [
      { doc: "Escalation to regulatory decision board or equivalent internal governance body", source: "Organization policy" },
    ],
    basis: "Assessment could not produce a reliable pathway recommendation because one or more questions critical to the determination remain unresolved. This is not a final regulatory conclusion — it is a signal that expert judgment, additional evidence, or FDA interaction is needed before proceeding.",
  },
  "PMA Annual Report / Letter to File": {
    required: [
      { doc: "Letter to File with change description and rationale", source: "QMSR; internal change-control records" },
      { doc: "Risk assessment confirming no impact on safety or effectiveness", source: "ISO 14971:2019; 21 CFR 814.39(a)" },
      { doc: "PMA Annual Report entry", source: "21 CFR 814.84" },
      ..._docModules.configMgmt,
      ..._docModules.cyberDevice,
    ],
    recommended: [
      ..._docModules.modelCardTransparencyRecommended,
    ],
    orgSpecific: [
      { doc: "Independent risk assessment review confirming no S&E impact", source: "Organization policy" },
    ],
    basis: "21 CFR 814.84; 21 CFR 814.39(a); Quality Management System Regulation (QMSR, incorporating ISO 13485:2016)",
  },
};
