/** Typed model for the post-assessment feedback survey. */

export interface FeedbackFormData {
  /** Q1: Did the assessment reach the conclusion you expected? */
  q1_conclusion: Q1Option | '';
  /** Q1b: How would you qualify it differently? (conditional on Q1) */
  q1b_qualify: string;
  /** Q2: Anything in the reasoning you would push back on? */
  q2_pushback: string;
  /** Q3: What would improve your confidence? */
  q3_confidence: string;
  /** Q4: How would you use ChangePath? (multi-select) */
  q4_use_cases: Q4Option[];
  /** Q4b: Other use case description (conditional on Q4 "Other") */
  q4b_other: string;
  /** Q5: What was most helpful or least helpful? */
  q5_helpful: string;
  /** Q6: Follow-up interest (multi-select) */
  q6_followup: Q6Option[];
  /** Q7: Contact info (conditional on Q6 interest) */
  q7_contact: ContactInfo;
  /** Q8: Referral (conditional on Q6 interest) */
  q8_referral: string;
}

export type Q1Option =
  | 'Yes — matches my conclusion'
  | 'Mostly — minor differences'
  | 'Partly — I would qualify the conclusion differently'
  | 'No — I would reach a different conclusion';

export const Q1_OPTIONS: Q1Option[] = [
  'Yes — matches my conclusion',
  'Mostly — minor differences',
  'Partly — I would qualify the conclusion differently',
  'No — I would reach a different conclusion',
];

/** Options that trigger the Q1b follow-up. */
export const Q1_FOLLOWUP_TRIGGERS: Q1Option[] = [
  'Partly — I would qualify the conclusion differently',
  'No — I would reach a different conclusion',
];

export type Q4Option =
  | 'Triage before full RA review'
  | 'Training or onboarding RA staff'
  | 'Change-control documentation support'
  | 'Submission planning'
  | 'Other';

export const Q4_OPTIONS: Q4Option[] = [
  'Triage before full RA review',
  'Training or onboarding RA staff',
  'Change-control documentation support',
  'Submission planning',
  'Other',
];

export type Q6Option =
  | 'Early access to future versions'
  | 'A longer pilot'
  | 'Walkthrough of the methodology'
  | 'Follow-up discussion (call)'
  | 'Not at this time';

export const Q6_OPTIONS: Q6Option[] = [
  'Early access to future versions',
  'A longer pilot',
  'Walkthrough of the methodology',
  'Follow-up discussion (call)',
  'Not at this time',
];

export interface ContactInfo {
  name: string;
  email: string;
  organization: string;
}

/** Returns true if Q7 (contact info) should be shown. */
export function shouldShowContact(q6: Q6Option[]): boolean {
  if (q6.length === 0) return false;
  // Show unless the only selection is "Not at this time"
  return !(q6.length === 1 && q6[0] === 'Not at this time');
}

export function createEmptyForm(): FeedbackFormData {
  return {
    q1_conclusion: '',
    q1b_qualify: '',
    q2_pushback: '',
    q3_confidence: '',
    q4_use_cases: [],
    q4b_other: '',
    q5_helpful: '',
    q6_followup: [],
    q7_contact: { name: '', email: '', organization: '' },
    q8_referral: '',
  };
}
