/**
 * Pure business logic for the HandoffPage preparation checklist.
 *
 * Generates checklist sections, titles, and descriptions based on
 * the pathway determination and assessment answers.
 */

import { AuthPathway, type Answers, type DeterminationResult } from './assessment-engine';

export interface ChecklistSection {
  n: number;
  title: string;
  detail: string;
  items: string[];
}

export const getSections = (determination: DeterminationResult, answers: Answers): ChecklistSection[] => {
  const isPMA = answers.A1 === AuthPathway.PMA;
  const isDeNovo = answers.A1 === AuthPathway.DeNovo;
  const isPCCPImpl = determination.isPCCPImpl;
  const isLTF = determination.isLetterToFile;
  const isCyberOnly = determination.isCyberOnly;
  const isBugFix = determination.isBugFix;
  const isPMAAnnualReport = determination.isPMAAnnualReport;
  const isPMAPCCP = isPCCPImpl && isPMA;

  if (isPCCPImpl) {
    return [
      {
        n: 1,
        title: 'Scope Verification Record',
        detail: 'Document PCCP boundary compliance',
        items: [
          'Confirm change type described in authorized PCCP',
          'Verify parameters within predefined bounds',
          'Document PCCP section references',
          'Verify cumulative impact within PCCP boundaries (P5)',
        ],
      },
      {
        n: 2,
        title: 'Validation per PCCP Protocol',
        detail: 'Execute the validation procedure',
        items: [
          'Execute validation per acceptance criteria',
          'Perform subgroup analysis (bias/equity)',
          'Document pass/fail for each criterion',
          'Obtain independent review/approval',
        ],
      },
      {
        n: 3,
        title: 'Risk, Labeling & Monitoring',
        detail: 'Update risk file, labeling, and activate monitoring',
        items: [
          'Update risk management file (ISO 14971)',
          'Review labeling for any updates required by the authorized PCCP, applicable regulations, or FDA conditions of authorization',
          'Update SBOM',
          'Activate post-deployment monitoring plan',
          isPMAPCCP
            ? 'Include implementation details in PMA Annual Report per 21 CFR 814.84'
            : 'Update PCCP implementation records per QMS',
          'Complete QMS change control record',
        ],
      },
    ];
  }

  if (isPMAAnnualReport) {
    return [
      {
        n: 1,
        title: 'Letter to File & Annual Report',
        detail: 'PMA-specific change documentation',
        items: [
          'Draft Letter to File with change description and rationale',
          'Document rationale confirming no impact on safety or effectiveness per 21 CFR 814.39',
          'Prepare PMA Annual Report entry per 21 CFR 814.84',
          'Update SBOM',
        ],
      },
      {
        n: 2,
        title: 'Risk Assessment',
        detail: 'Confirm no safety/effectiveness impact',
        items: [
          'Document risk assessment per ISO 14971',
          'Update configuration management record',
          'Update device history record',
        ],
      },
      {
        n: 3,
        title: 'QMS Filing',
        detail: 'Complete quality system documentation',
        items: [
          'Complete QMS change control record (QMSR / ISO 13485:2016)',
          'File Letter to File in device history record',
          'Submit PMA Annual Report update to FDA',
          'Obtain review and approval per QMS',
        ],
      },
    ];
  }

  if (isLTF) {
    return [
      {
        n: 1,
        title: 'Letter to File',
        detail: 'Change description, rationale, and basis',
        items: [
          'Draft LTF with change description and rationale',
          `Document regulatory basis (${
            isCyberOnly
              ? 'cybersecurity-only change per FDA SW Change Guidance Q1 — no functional impact'
              : isBugFix
                ? 'restore to cleared specification per FDA SW Change Guidance Q2'
                : 'non-significant per regulatory significance assessment'
          })`,
          'Update SBOM',
        ],
      },
      {
        n: 2,
        title: 'Risk Assessment',
        detail: 'Confirm no safety/effectiveness impact',
        items: ['Document risk assessment', 'Update configuration management record'],
      },
      {
        n: 3,
        title: 'QMS Filing',
        detail: 'Complete quality system documentation',
        items: [
          'Complete QMS change control record',
          'File in device history record',
          'Obtain review and approval per QMS',
        ],
      },
    ];
  }

  if (isPMA) {
    return [
      {
        n: 1,
        title: 'Supplement Type',
        detail: 'Determine PMA supplement category',
        items: [
          `Confirm type: ${answers.C_PMA4 || 'TBD'} per 21 CFR 814.39`,
          'Review supplement-specific requirements',
          'Identify clinical data requirements',
        ],
      },
      {
        n: 2,
        title: 'Submission Package',
        detail: 'Prepare core documents',
        items: [
          'Draft updated device description',
          'Prepare performance testing report',
          'Update software documentation (IEC 62304)',
          'Prepare clinical data package',
          'Update labeling',
          'Prepare submission-specific change summary / traceability package',
          'Include subgroup or bias analysis when relevant to the change',
          'Update SBOM if applicable',
        ],
      },
      {
        n: 3,
        title: 'Risk Analysis & QMS',
        detail: 'Complete risk and quality documentation',
        items: [
          'Update risk analysis (ISO 14971)',
          'Complete QMS change control record',
          'Obtain QA/RA review and approval',
        ],
      },
    ];
  }

  // Default: New Submission (510(k) or De Novo)
  return [
    {
      n: 1,
      title: isDeNovo ? 'Device-Type / Submission Strategy' : 'Predicate Strategy',
      detail: isDeNovo
        ? 'Confirm whether the modified device remains within the De Novo device type and special controls'
        : 'Establish substantial equivalence argument',
      items: isDeNovo
        ? [
            'Confirm the applicable De Novo classification regulation and special controls',
            'Assess whether the modified device still fits the established device type',
            'Consider FDA Pre-Submission (Q-Sub) for borderline device-type fit',
            'Identify testing requirements and evidence gaps',
            'If the modified device no longer fits the device type, discuss 510(k) vs new De Novo strategy with FDA',
          ]
        : [
            'Confirm predicate for 510(k)',
            'Draft updated substantial equivalence argument',
            'Identify testing requirements',
            'Consider Pre-Submission (Q-Sub)',
          ],
    },
    {
      n: 2,
      title: 'Submission Package',
      detail: 'Prepare core documents',
      items: [
        'Draft updated device description',
        'Prepare performance testing report',
        'Update software documentation (IEC 62304)',
        'Prepare cybersecurity documentation if applicable',
        'Update labeling',
        isDeNovo ? 'Compile submission package in the format confirmed with RA/FDA' : 'Compile eSTAR format',
        'Prepare submission-specific change summary / traceability package',
        'Include subgroup or bias analysis when relevant to the change',
        'Update SBOM if applicable',
      ],
    },
    {
      n: 3,
      title: 'Risk Analysis & Review',
      detail: 'Complete risk and quality documentation',
      items: [
        'Update risk analysis (ISO 14971)',
        'Complete QMS change control record',
        'Obtain QA/RA review and approval',
      ],
    },
  ];
};

export const getHandoffTitle = (determination: DeterminationResult, answers: Answers): string => {
  const isPMA = answers.A1 === AuthPathway.PMA;
  const isPCCPImpl = determination.isPCCPImpl;
  const isLTF = determination.isLetterToFile;
  const isPMAAnnualReport = determination.isPMAAnnualReport;

  if (isPCCPImpl && isPMA) return 'PMA Device — PCCP Implementation Preparation';
  if (isPCCPImpl) return 'PCCP Implementation Preparation';
  if (isPMAAnnualReport) return 'PMA Annual Report / Letter to File Preparation';
  if (isLTF) return 'Letter to File Preparation';
  if (isPMA) return 'PMA Supplement Preparation';
  return 'New Submission Preparation';
};

export const getHandoffDesc = (determination: DeterminationResult, answers: Answers): string => {
  const isPMA = answers.A1 === AuthPathway.PMA;
  const isDeNovo = answers.A1 === AuthPathway.DeNovo;
  const isPCCPImpl = determination.isPCCPImpl;
  const isLTF = determination.isLetterToFile;
  const isPMAAnnualReport = determination.isPMAAnnualReport;

  if (isPCCPImpl && isPMA)
    return 'Complete the PCCP implementation protocol sections below. Include in PMA Annual Report per 21 CFR 814.84.';
  if (isPCCPImpl) return 'Complete the PCCP implementation protocol sections below.';
  if (isPMAAnnualReport) return 'Document the change rationale for PMA Annual Report and Letter to File.';
  if (isLTF) return 'Document the change rationale and regulatory basis.';
  if (isPMA) return 'Prepare the PMA supplement package per 21 CFR 814.39.';
  if (isDeNovo)
    return 'Prepare the post-market submission strategy package — confirm with RA whether the modified device remains within the De Novo device type / special controls.';
  return 'Prepare the 510(k) submission package.';
};

export const getPreparationPackageLabel = (determination: DeterminationResult, answers: Answers): string => {
  const isPMA = answers.A1 === AuthPathway.PMA;
  const isDeNovo = answers.A1 === AuthPathway.DeNovo;

  if (determination.isPCCPImpl)
    return isPMA ? 'PCCP implementation record + PMA annual-report support' : 'PCCP implementation record';
  if (determination.isPMAAnnualReport) return 'PMA annual report entry + Letter to File';
  if (determination.isLetterToFile) return 'Letter to File package';
  if (isPMA) return answers.C_PMA4 ? `${answers.C_PMA4} supplement package` : 'PMA supplement package';
  if (isDeNovo) return '510(k) or De Novo strategy package';
  return '510(k) submission package';
};
