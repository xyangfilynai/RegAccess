import type { Answers } from './lib/assessment-engine';

/**
 * Synthetic sample case from the original regassess_v11.html (lines 1069–1101).
 * Pre-loaded for Quick Expert Review.
 */
export const SAMPLE_CASE: Answers = {
  // Block A — Device Profile
  A1: "510(k)",
  A1b: "K210000 (synthetic \u2014 not a real clearance)",
  A1c: "v3.2.1 \u2014 FDA-cleared baseline",
  A1d: "The device is intended to assist radiologists in detecting suspected lung nodules on chest CT images in adult patients (\u226518 years). The device does not provide a diagnosis.",
  A2: "No",
  A6: ["Deep Learning (e.g., CNN, RNN)"],
  A8: "3",
  // Block B — Change Classification
  B1: "Training Data",
  B2: "Additional data \u2014 new clinical sites",
  B3: "No",
  B4: "The manufacturer retrained the cleared lung-nodule detection model using 18,000 additional adult chest CT studies from four community hospitals not included in the original clearance. The intended use, adult population (\u226518), output format, and model architecture (ResNet-based CNN) remain unchanged. The new sites use GE Revolution and Canon Aquilion scanners not represented in the original training set (which used only Siemens SOMATOM). Internal validation on a held-out test set shows aggregate AUC improved slightly (0.94 \u2192 0.95) and overall sensitivity is stable at the cleared operating threshold. However, subgroup analysis reveals a meaningful sensitivity drop for 4\u20138 mm nodules on Canon scanners (78% vs. 91% on Siemens at the cleared threshold) and a 40% higher false-positive rate in patients \u226575 with chronic lung disease. No labeling change is proposed. The team initially assessed this as a routine performance refresh suitable for documentation only.",
  // Block C — Regulatory Significance
  C1: "No",
  C2: "No",
  C3: "Uncertain",
  C4: "No",
  C5: "No",
  C6: "Yes",
  C10: "No",
  // Block E — Bias & Equity
  E1: "Uncertain",
  E2: "Yes",
  E3: "Uncertain",
  E4: "No",
  E5: "No",
};
