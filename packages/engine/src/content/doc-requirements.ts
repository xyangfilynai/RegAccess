interface DocumentRequirement {
  doc: string;
  source: string;
}

interface DocumentationRequirementSet {
  required: DocumentRequirement[];
  recommended: DocumentRequirement[];
  orgSpecific: DocumentRequirement[];
  basis: string;
  scopeNote?: string;
}

const docModules: Record<string, DocumentRequirement[]> = {
  baseQMS: [{ doc: 'QMS change control record', source: 'ISO 13485:2016 §7.3.9 (QMSR)' }],
  riskAssessment: [{ doc: 'Updated risk analysis', source: 'ISO 14971:2019' }],
  riskAssessmentNoImpact: [
    { doc: 'Risk assessment confirming no impact on safety or effectiveness', source: 'ISO 14971:2019 §7' },
  ],
  configMgmt: [{ doc: 'Configuration management record update', source: 'IEC 62304 §8.1.2' }],
  cyberDevice: [
    {
      doc: 'Software Bill of Materials (SBOM) update, when applicable to the device or software inventory change (for premarket submissions involving devices that meet the statutory definition of a cyber device, see §524B)',
      source: 'FDA-CYBER-2026 §V; FD&C Act §524B(b)(3)',
    },
  ],
  cyberDeviceFull: [
    {
      doc: 'Software Bill of Materials (SBOM), when applicable to the submission (for devices that meet the statutory definition of a cyber device, see §524B)',
      source: 'FDA-CYBER-2026 §V; FD&C Act §524B(b)(3)',
    },
    { doc: 'Cybersecurity documentation, when applicable to the submission', source: 'FDA-CYBER-2026' },
  ],
  swDocs: [{ doc: 'Software documentation per IEC 62304', source: 'IEC 62304' }],
  modelCardRecommended: [
    {
      doc: 'Model card / Algorithm Change Protocol (recommended per draft guidance — verify finalization status at fda.gov)',
      source: 'FDA-LIFECYCLE-2025 §V.D',
    },
  ],
  modelCardTransparencyRecommended: [
    {
      doc: 'Model card / transparency documentation update (recommended per draft guidance — verify finalization status at fda.gov)',
      source: 'FDA-LIFECYCLE-2025 §V.D',
    },
  ],
  biasRecommended: [
    {
      doc: 'Bias / equity assessment (recommended per draft guidance — verify finalization status at fda.gov)',
      source: 'FDA-LIFECYCLE-2025 §IV.B',
    },
  ],
  pccpFutureRecommended510k: [
    {
      doc: 'PCCP for future changes — consider including if the device does not yet have an authorized PCCP. A PCCP in this submission may support defined future changes when authorized by FDA. See Marketing Submission Recommendations for a PCCP for AI-Enabled Device Software Functions (Aug 2025), Sections V–VIII.',
      source: 'FDA-PCCP-2025',
    },
  ],
  pccpFutureRecommendedPMA: [
    {
      doc: 'PCCP for future changes — consider including if the device does not yet have an authorized PCCP. A PCCP in this PMA supplement may support defined future changes when authorized by FDA. See Marketing Submission Recommendations for a PCCP for AI-Enabled Device Software Functions (Aug 2025), Sections V–VIII.',
      source: 'FDA-PCCP-2025',
    },
  ],
  pccpDocs: [
    { doc: 'PCCP scope verification record (change type, boundaries, protocol match)', source: 'FDA-PCCP-2025 §V–VI' },
    { doc: 'Validation report per PCCP-specified acceptance criteria', source: 'FDA-PCCP-2025 §VII' },
    { doc: 'Pass/fail documentation for each acceptance criterion', source: 'FDA-PCCP-2025 §VII' },
    {
      doc: 'Labeling review and update — review labeling for any updates required by the authorized PCCP, applicable regulations, or FDA conditions of authorization; include PCCP-related labeling statements where required or specified',
      source: 'FDA-PCCP-2025 §V.C; §IX',
    },
    {
      doc: 'PCCP implementation reporting update (PMA: Annual Report per 21 CFR 814.84; 510(k)/De Novo: per QMS)',
      source: 'FDA-PCCP-2025 §V.C',
    },
  ],
};

export const docRequirements: Record<string, DocumentationRequirementSet> = {
  'Letter to File': {
    required: [
      {
        doc: 'Letter to File with change description, rationale, and regulatory basis',
        source: 'QMSR; internal change-control records',
      },
      ...docModules.riskAssessmentNoImpact,
      ...docModules.configMgmt,
      ...docModules.baseQMS,
      ...docModules.cyberDevice,
    ],
    recommended: [...docModules.modelCardTransparencyRecommended],
    orgSpecific: [
      { doc: 'Performance comparison summary (pre/post change)', source: 'Organization policy' },
      { doc: 'Subgroup analysis of affected populations', source: 'Organization policy' },
    ],
    basis:
      'Deciding When to Submit a 510(k) for a Software Change to an Existing Device (Oct 2017) — Cybersecurity/Restore-to-Spec exemptions or all significance fields NO; QMSR; internal change-control records; Quality Management System Regulation (QMSR, incorporating ISO 13485:2016)',
  },
  'Implement Under Authorized PCCP': {
    required: [
      ...docModules.pccpDocs,
      ...docModules.baseQMS,
      { doc: 'Risk management file update', source: 'ISO 14971:2019' },
      ...docModules.cyberDevice,
    ],
    recommended: [
      ...docModules.biasRecommended,
      { doc: 'Post-deployment performance monitoring plan activation', source: 'FDA-PCCP-2025 §VII' },
      {
        doc: 'Subgroup analysis report (recommended per draft guidance — verify finalization status at fda.gov)',
        source: 'FDA-LIFECYCLE-2025 §V.B',
      },
      {
        doc: 'Real-world performance monitoring plan (TPLC approach; recommended per draft guidance — verify finalization status at fda.gov)',
        source: 'FDA-LIFECYCLE-2025 §VI',
      },
    ],
    orgSpecific: [
      {
        doc: 'Independent verification of PCCP boundary compliance (by a reviewer not involved in the change)',
        source: 'Organization policy',
      },
      { doc: 'Cumulative PCCP implementation log with running impact assessment', source: 'Organization policy' },
    ],
    basis:
      'Marketing Submission Recommendations for a PCCP for AI-Enabled Device Software Functions (Aug 2025) §V–VIII; Quality Management System Regulation (QMSR, incorporating ISO 13485:2016 §7.3.9)',
  },
  'New Submission Required': {
    required: [
      {
        doc: 'Predicate comparison or De Novo device-type / classification strategy narrative, as applicable to the planned submission',
        source: '21 CFR 807.87; 21 CFR 807.92',
      },
      { doc: 'Updated device description', source: '21 CFR 807.87(e)' },
      { doc: 'Performance testing report (pre/post change comparison)', source: 'FDA-SW-510K-2017 Q4' },
      ...docModules.swDocs,
      ...docModules.riskAssessment,
      { doc: 'Updated labeling', source: '21 CFR 807.87(e)' },
      {
        doc: 'Submission package in required format (eSTAR for 510(k); De Novo Request format per FDA guidance)',
        source: 'FDA eSTAR guidance; FDA De Novo guidance',
      },
      ...docModules.cyberDeviceFull,
    ],
    recommended: [
      ...docModules.modelCardRecommended,
      ...docModules.biasRecommended,
      { doc: 'Pre-Submission (Q-Sub) meeting with FDA', source: 'FDA Q-Sub Guidance' },
      { doc: 'Clinical evidence sufficiency assessment', source: 'Best practice' },
      ...docModules.pccpFutureRecommended510k,
      {
        doc: 'Real-world performance monitoring plan (recommended per draft guidance — verify finalization status at fda.gov)',
        source: 'FDA-LIFECYCLE-2025 §VI',
      },
    ],
    orgSpecific: [
      { doc: 'Clinical evidence sufficiency assessment', source: 'Organization policy' },
      {
        doc: 'Peer review of substantial equivalence argument by independent RA professional',
        source: 'Organization policy',
      },
    ],
    basis:
      '21 CFR 807.81(a)(3); Deciding When to Submit a 510(k) for a Software Change to an Existing Device (Oct 2017)',
  },
  'PMA Supplement Required': {
    required: [
      { doc: 'PMA supplement type determination', source: '21 CFR 814.39(a)–(e)' },
      { doc: 'Updated device description', source: '21 CFR 814.39' },
      { doc: 'Clinical data (per supplement type requirements)', source: '21 CFR 814.39' },
      ...docModules.riskAssessment,
      { doc: 'Performance testing report', source: '21 CFR 814.39' },
      ...docModules.swDocs,
      { doc: 'Updated labeling', source: '21 CFR 814.39(c)' },
      ...docModules.cyberDeviceFull,
    ],
    recommended: [
      ...docModules.modelCardRecommended,
      ...docModules.biasRecommended,
      { doc: 'Pre-Submission (Q-Sub) meeting with FDA', source: 'FDA Q-Sub Guidance' },
      ...docModules.pccpFutureRecommendedPMA,
      { doc: 'Post-market surveillance plan update', source: '21 CFR 814.82' },
    ],
    orgSpecific: [
      { doc: 'Independent clinical review of supplement type determination', source: 'Organization policy' },
      { doc: 'Advisory committee preparation materials (for Panel-Track supplements)', source: 'Organization policy' },
    ],
    basis: '21 CFR 814.39; FDA-PMA-SUPPLEMENTS-2008',
    scopeNote:
      'Scope limitation: ChangePath identifies that a PMA supplement is required but does not list supplement-type-specific documentation. The supplement type (Panel-Track, 180-Day, Real-Time, Special, 30-Day, or 30-Day Notice) selected in field C_PMA4 drives submission format, clinical data, and review timeline. Consult 21 CFR 814.39(a)–(f) and your PMA approval order.',
  },
  'Assessment Incomplete': {
    required: [
      {
        doc: 'Document each unresolved field and why it could not be closed',
        source: 'Internal change-control records',
      },
      {
        doc: 'Record the current assessment state and all answers provided so far',
        source: 'QMSR; internal change-control records',
      },
    ],
    recommended: [
      { doc: 'Pre-Submission (Q-Sub) meeting request with FDA to resolve open items', source: 'FDA Q-Sub Guidance' },
      {
        doc: 'Senior RA / clinical expert review of the unresolved areas before re-assessment',
        source: 'Best practice',
      },
      {
        doc: 'Risk analysis assuming the most conservative answer for each unresolved field',
        source: 'ISO 14971:2019',
      },
    ],
    orgSpecific: [
      {
        doc: 'Escalation to regulatory decision board or equivalent internal governance body',
        source: 'Organization policy',
      },
    ],
    basis:
      'Assessment could not produce a reliable pathway recommendation because one or more fields critical to the determination remain unresolved. This is not a final regulatory conclusion — expert judgment, additional evidence, or FDA interaction may be needed before proceeding.',
  },
  'PMA Annual Report / Letter to File': {
    required: [
      { doc: 'Letter to File with change description and rationale', source: 'QMSR; internal change-control records' },
      {
        doc: 'Risk assessment confirming no impact on safety or effectiveness',
        source: 'ISO 14971:2019; 21 CFR 814.39(a)',
      },
      { doc: 'PMA Annual Report entry', source: '21 CFR 814.84' },
      ...docModules.configMgmt,
      ...docModules.cyberDevice,
    ],
    recommended: [...docModules.modelCardTransparencyRecommended],
    orgSpecific: [
      { doc: 'Independent risk assessment review confirming no S&E impact', source: 'Organization policy' },
    ],
    basis: '21 CFR 814.84; 21 CFR 814.39(a); Quality Management System Regulation (QMSR, incorporating ISO 13485:2016)',
  },
};
