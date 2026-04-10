/**
 * Centralized documentation of conservative internal policies.
 *
 * ChangePath applies several risk-based policies that intentionally exceed FDA
 * minimum requirements. They are internal engineering choices, NOT direct
 * regulatory mandates. This file documents each one so they can be reviewed,
 * calibrated, or removed in a single place.
 *
 * The actual enforcement of these policies lives in the assessment engine and
 * evidence-gap logic. This file is the authoritative reference; code comments
 * elsewhere should point here for the policy rationale.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * POLICY 1 — Significance uncertainty treated as requiring submission
 *
 *   Rule:  When one or more non-PMA significance fields (C3-C6) are answered
 *          "Uncertain", the pathway is treated as requiring a marketing
 *          submission rather than a documentation-only pathway.
 *
 *   Why:   Unresolved risk uncertainty should not be silently converted into a
 *          benign pathway. The policy ensures a human resolves each uncertainty
 *          with evidence before the pathway closes.
 *
 *   Source class: Internal conservative policy
 *   Enforcement:
 *     - computeDetermination.ts — consistency rule ISSUE-UncertainSignificance
 *     - evidence-gaps.ts — GAP-UNCERTAIN-* gap items
 *     - review-insights.ts — uncertainty insight items
 *
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * POLICY 2 — PMA safety/effectiveness uncertainty treated as requiring supplement
 *
 *   Rule:  When the PMA safety/effectiveness field (C_PMA1) is answered
 *          "Uncertain", the pathway is treated as requiring a PMA supplement.
 *
 *   Why:   For PMA devices, unresolved safety or effectiveness impact is itself
 *          enough to keep the case in supplement review until the impact is
 *          resolved.
 *
 *   Source class: Internal conservative policy
 *   Enforcement:
 *     - computeDetermination.ts — consistency rule ISSUE-PMASafetyUncertainty
 *     - computeDetermination.ts — pathway rule PMA-SafetyEffectivenessUncertain
 *
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * POLICY 3 — Baseline completeness required before any pathway conclusion
 *
 *   Rule:  The authorization identifier (A1b), baseline version (A1c), and
 *          authorized IFU statement (A1d) must all be provided before a pathway
 *          can be finalized.
 *
 *   Why:   Without a defined comparison point, the assessment has no anchor for
 *          what changed.
 *
 *   Source class: Internal conservative policy (per FDA-SW-510K-2017; FDA-PCCP-2025 §V)
 *   Enforcement:
 *     - evidence-gaps.ts — GAP-BASELINE
 *     - case-specific-reasoning.ts — baseline-incomplete blocker
 *
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * POLICY 4 — Subgroup performance drop threshold (>5%)
 *
 *   Rule:  Flag any demographic subgroup where model performance drops more
 *          than 5% from aggregate metrics.
 *
 *   Why:   Heuristic to surface potential bias. The 5% threshold is not derived
 *          from any FDA regulation or guidance and should be calibrated to the
 *          device's risk profile.
 *
 *   Source class: Internal conservative policy
 *   Enforcement:
 *     - getQuestions.ts — field E4 help text
 *
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * POLICY 5 — Cumulative-change SE uncertainty treated as incomplete
 *
 *   Rule:  When the cumulative substantial-equivalence field (C11) is answered
 *          "Uncertain", the pathway cannot be finalized.
 *
 *   Why:   Unresolved SE uncertainty after a cumulative-change review means the
 *          predicate comparison is still open.
 *
 *   Source class: Internal conservative policy (per 21 CFR 807.87; 21 CFR 807.92)
 *   Enforcement:
 *     - computeDetermination.ts — significanceIncomplete flag
 *     - case-specific-reasoning.ts — SE-uncertain blocker
 */

// This file is documentation-only. The policy rationale above is the
// authoritative reference; code comments elsewhere point here.
