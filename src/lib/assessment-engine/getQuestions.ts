import { Answer, AuthPathway, Answers } from './types';
import { changeTaxonomy, type ChangeTypeDefinition } from './changeTaxonomy';

/**
 * Derived-state shape expected by getBlockFields / getBlocks.
 * Matches the return type of computeDerivedState.
 */
export interface DerivedState {
  hasGenAI: boolean;
  isCatIntendedUse: boolean;
  hasPCCP: boolean;
  isPMA: boolean;
  isDeNovo: boolean;
}

export interface AssessmentField {
  id: string;
  q?: string;
  type?: string;
  options?: string[];
  skip?: boolean;
  sectionDivider?: boolean;
  label?: string;
  sublabel?: string;
  icon?: string;
  help?: string;
  pathwayCritical?: boolean;
  critical?: boolean;
  dynamic?: boolean;
  disabled?: boolean;
  infoNote?: string | null;
  autoWarn?: string | null;
  forcedValue?: string | number | boolean | null;
  consequencePreview?: string | {
    yes?: string;
    no?: string;
    uncertain?: string;
  } | null;
  mlguidance?: string;
  draftRef?: boolean;
  classificationGuidance?: string | null;
  boundaryNote?: string | null;
  selectedTypeData?: ChangeTypeDefinition | null;
}

export interface Block {
  id: string;
  label: string;
  shortLabel: string;
  icon: string;
  description?: string;
}

/**
 * Pure extraction of getBlocks from regassess_v11.html lines 1221–1233.
 */
export const getBlocks = (answers: Answers, ds: DerivedState): Block[] => {
  const b: Block[] = [
    { id: "A", label: "What device are we assessing?", shortLabel: "Device profile", icon: "shield", description: "Record the authorized device, baseline, intended use, and change-control context before significance analysis." },
    { id: "B", label: "What changed?", shortLabel: "Change classification", icon: "layers", description: "Describe the modification so downstream logic uses the correct change category and intended-use assessment." },
    { id: "C", label: "Is this change regulatory-significant?", shortLabel: "Regulatory significance", icon: "alert", description: "Assess effects on safety, effectiveness, substantial equivalence, and reporting or submission obligations." },
  ];
  if (ds.hasPCCP && answers.B3 !== Answer.Yes && answers.B3 !== Answer.Uncertain) b.push({ id: "P", label: "Is this covered by the PCCP?", shortLabel: "PCCP scope", icon: "checkCircle", description: "Confirm the change stays within authorized PCCP boundaries, the validation protocol, and cumulative limits." });
  if (ds.hasGenAI) b.push({ id: "D", label: "GenAI-specific checks", shortLabel: "GenAI supplemental", icon: "cpu", description: "Review base model, prompts, RAG, guardrails, and other GenAI changes that may affect clinical performance or controls." });
  b.push({ id: "E", label: "Population impact check", shortLabel: "Bias and equity", icon: "scale", description: "Assess population fit, subgroup performance, bias controls, and whether added expert review is warranted." });
  b.push({ id: "review", label: "Final review", shortLabel: "Review", icon: "check", description: "Review the determination pathway, evidence gaps, documentation cues, and notes before relying on the output." });
  return b;
};

/**
 * Pure extraction of block field definitions from regassess_v11.html lines 1237–1510.
 * Signature: getBlockFields(blockId, answers, derivedState)
 *
 * The original was a closure over component state; this version takes
 * answers and derivedState as explicit parameters instead.
 */
export const getBlockFields = (blockId: string, answers: Answers, ds: DerivedState): AssessmentField[] => {
  const { hasGenAI, isCatIntendedUse, isPMA } = ds;

  switch (blockId) {
    case "A": return [
      { id: "A_SEC1", sectionDivider: true, label: "Pathway-critical fields", sublabel: "These fields drive pathway logic and should match your authorization record.", icon: "shield" },
      { id: "A1", q: "What is the current regulatory authorization pathway?", type: "single",
        options: ["510(k)", "De Novo", "PMA"],
        pathwayCritical: true,
        help: "The existing regulatory basis determines which change assessment framework applies. For software changes to De Novo-authorized devices that remain subject to 510(k) requirements, FDA's 510(k) change guidances are relevant; continued fit with the De Novo device type and special controls should also be checked." },
      { id: "A1b", q: "What is the current U.S. authorization identifier (e.g., K#, DEN#, P#)?", type: "text",
        pathwayCritical: true,
        help: "Ties the assessment to a specific authorization record. Without it, outputs are harder to defend." },
      { id: "A1c", q: "What is the authorized baseline being used for comparison (e.g., cleared/approved version, released build, or design baseline)?", type: "text",
        pathwayCritical: true,
        help: "Regulatory reviewers compare the proposed change to a defined authorized baseline, not just the latest marketed build." },
      { id: "A1d", q: "Paste or summarize the currently authorized indications for use (IFU) statement.", type: "text",
        pathwayCritical: true,
        help: "Required for the intended use comparison. Compare the proposed change against this exact statement." },
      { id: "A2", q: "Does the device have an FDA-authorized Predetermined Change Control Plan (PCCP)?", type: "yesno",
        pathwayCritical: true,
        help: "An authorized PCCP can allow defined modifications without a new submission when implementation stays within the authorized scope, boundaries, and protocols. See FDORA §515C and FDA PCCP final guidance (Dec 2024, reissued Aug 2025)." },
      { id: "A6", q: "What type of AI/ML technology does the device use?", type: "multi",
        options: ["Traditional ML (e.g., random forest, SVM)", "Deep Learning (e.g., CNN, RNN)", "Transformer / Attention-Based", "LLM / Foundation Model", "Generative AI", "Ensemble / Multi-Model", "Federated Learning"],
        pathwayCritical: true,
        infoNote: hasGenAI ? "Generative AI / LLM / Foundation Model detected — a dedicated Generative AI Supplemental assessment block will appear after the Regulatory Significance step. This covers base model changes, prompt modifications, RAG knowledge base, guardrails, hallucination testing, and adversarial testing." : null,
        help: "Selecting LLM / Foundation Model or Generative AI will add a dedicated 'Generative AI Supplemental' assessment block (Block D) later in the assessment flow, covering base model changes, prompt engineering, RAG, guardrails, hallucination testing, and explainability." },
      { id: "A8", q: "How many changes have been implemented since the last regulatory submission?", type: "numeric",
        pathwayCritical: true,
        help: "Cumulative change count informs drift assessment. A high number of changes warrants closer review of whether the device's overall behavior has shifted from its cleared specification." },
    ];

    case "B": return [
      { id: "B1", q: "What category of change is being made?", type: "single",
        options: [...Object.keys(changeTaxonomy), "Other (not listed — describe below)"],
        pathwayCritical: true,
        help: "Select the category that best describes the change. This determines the available specific change types." },
      { id: "B2", q: "What is the specific type of change?", type: "single",
        options: answers.B1 ? (changeTaxonomy[answers.B1]?.types?.map((t) => t.name) || []) : [],
        dynamic: true, disabled: !answers.B1,
        help: answers.B1 ? "Select the specific change type within the selected category." : "Select a change category first.",
        classificationGuidance: answers.B1 ? changeTaxonomy[answers.B1]?.classificationGuidance : null,
        boundaryNote: answers.B1 ? changeTaxonomy[answers.B1]?.boundaryNote : null,
        selectedTypeData: (answers.B1 && answers.B2) ? changeTaxonomy[answers.B1]?.types?.find((t) => t.name === answers.B2) : null },
      { id: "B3", q: "Does this change affect the intended use or indications for use?", type: "yesnouncertain",
        critical: true, pathwayCritical: true,
        autoWarn: isCatIntendedUse ? "You selected 'Intended Use / Indications for Use' as the change category. This category frequently affects intended use — but you must explicitly confirm by comparing the proposed change against the authorized indications for use (IFU) statement word-by-word. Do not assume 'Yes' without that comparison." : null,
        forcedValue: null,
        consequencePreview: null,
        mlguidance: "Pull up the clearance letter and Indications for Use statement. Compare word-by-word: does the change expand the patient population, clinical setting, anatomical region, severity scope, or diagnostic capability? For GenAI: does expanded prompting ability or RAG content broaden effective clinical scope even if the stated IFU hasn't changed?",
        help: "The most consequential field in the assessment. Compare the proposed change against the exact authorized indications for use (IFU), labeling claims, population, clinical context, and outputs. PCCPs are intended to be focused and bounded within the originally reviewed device scope; ChangePath therefore treats intended-use changes as outside routine PCCP implementation unless explicit FDA authorization for that exact scope is documented." },
      { id: "B4", q: "Describe the change in detail.", type: "text",
        help: "Provide a clear description: what is changing, the scope, data sources affected, and components modified. This becomes part of your assessment record." },
    ];

    case "C": {
      if (isPMA) {
        return [
          { id: "C_PMA1", q: "Does this change affect the safety or effectiveness of the device?", type: "yesnouncertain",
            skip: answers.B3 === Answer.Yes, pathwayCritical: true,
            mlguidance: "PMA threshold is lower than 510(k): any change that COULD affect safety or effectiveness. Run full validation suite and compare every metric. For AI/ML: check not just overall performance but subgroup stability, calibration drift, and failure mode distribution. If any metric shows a statistically meaningful shift, answer 'Yes' or 'Uncertain.'",
            help: "Under 21 CFR 814.39(a), any change affecting safety or effectiveness of a PMA-approved device requires a PMA supplement. See FDA PCCP Final Guidance (Dec 2024, reissued Aug 2025), Section V.B for establishing a PCCP through the PMA pathway." },
          { id: "C_PMA2", q: "Does this change affect the device labeling?", type: "yesno",
            skip: answers.B3 === Answer.Yes, pathwayCritical: true,
            help: "Labeling changes are examples of PMA postapproval changes that require a supplement if they affect safety or effectiveness. Editorial or clarifying labeling changes with no safety/effectiveness impact may instead be reportable in the periodic report under 21 CFR 814.39(b) and 21 CFR 814.84." },
          { id: "C_PMA3", q: "Does this change affect the manufacturing process or facility?", type: "yesno",
            skip: answers.B3 === Answer.Yes, pathwayCritical: true,
            help: "Manufacturing or facility changes require PMA postapproval reporting based on their regulatory effect. If the change affects safety or effectiveness, it may require a PMA supplement or a 30-day notice for qualifying manufacturing procedure/method changes under 21 CFR 814.39(f). If it does not affect safety or effectiveness, it may be periodic-reportable under 21 CFR 814.39(b)." },
          { id: "C_PMA4", q: "What type of PMA supplement is anticipated?", type: "single",
            skip: answers.B3 !== Answer.Yes && answers.C_PMA1 !== Answer.Yes && answers.C_PMA1 !== Answer.Uncertain,
            options: ["Panel-Track Supplement (major change / typically substantial clinical evidence)", "180-Day Supplement (§814.39(a) — change affecting safety/effectiveness not requiring panel-track)", "Real-Time Supplement (minor change reviewed in real time; see FDA Real-Time PMA Supplements guidance)", "Special PMA Supplement — Changes Being Effected (§814.39(d) — certain safety-enhancing labeling or manufacturing changes)", "30-Day PMA Supplement (§814.39(e) — only when FDA has specifically advised this alternate submission)", "30-Day Notice (§814.39(f) — qualifying manufacturing procedure/method changes only)"],
            help: "Supplement type depends on the nature and scope of the change:\n• Panel-Track: Major changes, often including new indications for use or other changes typically needing substantial clinical evidence.\n• 180-Day: Changes affecting safety or effectiveness that do not fit a more specific alternative.\n• Real-Time: Certain minor changes that FDA agrees to review through the real-time process.\n• Special — Changes Being Effected: Certain safety-enhancing labeling or manufacturing changes under §814.39(d).\n• 30-Day PMA Supplement: An alternate submission under §814.39(e), only when FDA has specifically advised that this pathway is permitted.\n• 30-Day Notice: Certain manufacturing procedure or method changes under §814.39(f). If the notice is not adequate, FDA may require a 135-day PMA supplement.\nMinor changes that do not affect safety or effectiveness may instead be reportable in the PMA annual/periodic report under §814.39(b) and §814.84." },
        ];
      }

      return [
        { id: "C0_DN1", q: "Does the modified device still fit within the De Novo classification device type and special controls?", type: "yesnouncertain",
          skip: answers.A1 !== AuthPathway.DeNovo || answers.B3 === Answer.Yes,
          help: "Before assessing significance under the 510(k)-based change framework, first confirm the modified device still falls within the device type established by the De Novo authorization. If the device no longer fits the device type or special controls, a 510(k) to a different predicate or a new De Novo request may be required instead." },
        { id: "C0_DN2", q: "Can the modified device comply with all special controls specified in the De Novo classification order?", type: "yesnouncertain",
          skip: answers.A1 !== AuthPathway.DeNovo || answers.B3 === Answer.Yes || answers.C0_DN1 === Answer.Yes,
          help: "Special controls are the regulatory basis for the De Novo classification. If the modified device cannot comply with one or more special controls, the modification may require a different regulatory strategy. Consider an FDA Pre-Submission (Q-Sub)." },
        { id: "C1", q: "Is this change solely to strengthen cybersecurity with no impact on device function or performance?", type: "yesnouncertain",
          skip: answers.B3 === Answer.Yes, pathwayCritical: true,
          help: "Pure cybersecurity patches with verified zero performance impact do not require a new 510(k). Per FDA Software Change Guidance (Oct 2017), Section V, Flowchart Question 1 — cybersecurity-only changes. FDA requires the change to be 'solely to strengthen cybersecurity' with no other impact, supported by appropriate analysis/verification/validation. This pathway requires affirmative demonstration — if uncertain, select 'Uncertain' and the assessment will continue to the full significance evaluation. Note: Cybersecurity in Medical Devices: Quality Management System Considerations and Content of Premarket Submissions Guidance (Feb 2026), Section VII addresses §524B requirements for cyber devices." },
        { id: "C2", q: "Is this change solely to restore the device to its most recently cleared specification (i.e., a bug fix)?", type: "yesnouncertain",
          skip: answers.B3 === Answer.Yes || answers.C1 === Answer.Yes, pathwayCritical: true,
          help: "Bug fixes that restore the device to its most recently cleared specification do not require a new 510(k). Per FDA Software Change Guidance (Oct 2017), Section V, Flowchart Question 2 — restore to specification. This pathway requires affirmative demonstration that the change returns the device to a known cleared state — if uncertain, select 'Uncertain' and the assessment will continue to the full significance evaluation." },
        { id: "C3", q: "Does this change introduce a new or modified risk of harm with potential for patient injury?", type: "yesnouncertain",
          skip: answers.B3 === Answer.Yes || answers.C1 === Answer.Yes || answers.C2 === Answer.Yes, pathwayCritical: true,
          infoNote: (answers.C3 === Answer.Yes || answers.C3 === Answer.Uncertain) ? "Because this field was answered 'Yes' or 'Uncertain,' the remaining significance sub-fields (C4–C6) are not shown — the pathway determination is already triggered. However, for a complete regulatory record (Letter to File or submission), you should still evaluate and document all applicable risk dimensions (new hazardous situations, risk control impacts, and clinical performance effects) outside ChangePath." : null,
          mlguidance: "Could this change cause the model to miss diagnoses it previously caught? Run your existing test set through both versions — if the change creates a new clinically relevant error pattern, worsens a known failure mode, or leaves patient-harm risk unresolved, answer 'Yes' or 'Uncertain.'",
          help: "Review your risk management file (ISO 14971 §7). A new or modified cause of a hazardous situation with significant unmitigated harm requires a new submission. Per FDA Software Change Guidance (Oct 2017), Section V, Flowchart Question 3 — risk assessment. Note: FDA groups these risk topics under Flowchart Question 3 as one flowchart step. ChangePath decomposes that step into three sub-fields (C3, C4, C5) for granularity. When documenting for regulatory purposes, map all three back to Q3. This sub-field addresses new or modified causes of harm." },
        { id: "C4", q: "Does this change create an entirely new hazardous situation not present in the current risk analysis?", type: "yesnouncertain",
          skip: answers.B3 === Answer.Yes || answers.C1 === Answer.Yes || answers.C2 === Answer.Yes || answers.C3 === Answer.Yes, pathwayCritical: true,
          mlguidance: "Review your risk management file for the current hazard list. Does this change create a failure mode NOT already documented? For architecture changes: new model families have different failure modes (e.g., transformers hallucinate differently than CNNs). For GenAI: check for novel hazard categories like fabricated clinical recommendations.",
          help: "Distinct from the Cause of Harm field: this asks whether the change introduces an entirely new type of risk scenario. Per FDA Software Change Guidance (Oct 2017), Section V, Flowchart Question 3 — risk assessment. Note: FDA groups these topics under Flowchart Question 3 as one flowchart step; ChangePath decomposes that step into sub-fields (C3, C4, C5) for granularity. When documenting for regulatory purposes, map all three back to Q3. This sub-field addresses new hazardous situations." },
        { id: "C5", q: "Does this change create or necessitate a change to a risk control measure for a hazardous situation with significant harm potential?", type: "yesnouncertain",
          skip: answers.B3 === Answer.Yes || answers.C1 === Answer.Yes || answers.C2 === Answer.Yes || answers.C3 === Answer.Yes || answers.C4 === Answer.Yes, pathwayCritical: true,
          mlguidance: "Check your risk control matrix. If this change modifies guardrails, safety filters, confidence thresholds, human-in-the-loop overrides, or output constraints, those are risk controls. Also check: does the change weaken monitoring or anomaly detection that served as a risk mitigation?",
          help: "If the change modifies, weakens, or removes an existing risk control, it may trigger regulatory significance. Per FDA Software Change Guidance (Oct 2017), Section V, Flowchart Question 3 — risk assessment. Note: FDA groups these topics under Flowchart Question 3 as one flowchart step; ChangePath decomposes that step into sub-fields (C3, C4, C5) for granularity. When documenting for regulatory purposes, map all three back to Q3. This sub-field addresses risk control impact." },
        { id: "C6", q: "Could this change significantly affect clinical functionality or performance specifications?", type: "yesnouncertain",
          skip: answers.B3 === Answer.Yes || answers.C1 === Answer.Yes || answers.C2 === Answer.Yes || answers.C3 === Answer.Yes || answers.C4 === Answer.Yes || answers.C5 === Answer.Yes, pathwayCritical: true,
          mlguidance: "Compare performance metrics before and after on your holdout test set. If sensitivity, specificity, or any key metric changes beyond the predefined acceptance range, answer 'Yes.'",
          help: "Changes that significantly affect clinical functionality or performance specifications require a new submission. Per FDA Software Change Guidance (Oct 2017), Section V, Flowchart Question 4 — could the change significantly affect clinical functionality or performance specifications." },
        { id: "C10", q: "Considering all changes since last submission, has the device's overall behavior materially drifted from its cleared specification?", type: "yesnouncertain",
          skip: !answers.A8 || parseInt(answers.A8) === 0,
          help: "Even if each individual change was non-significant, the cumulative effect may have shifted the device from its cleared state." },
        { id: "C11", q: "Is substantial equivalence to the predicate device still supportable after this change?", type: "yesnouncertain",
          skip: answers.A1 !== AuthPathway.FiveOneZeroK || answers.C10 !== Answer.Yes,
          help: "Compare the current device specification (including all accumulated changes) against the predicate." },
      ];
    }

    case "P": return [
      { id: "P1", q: "Is this specific change type explicitly described in the authorized PCCP?", type: "yesno", pathwayCritical: true,
        help: "The PCCP must specifically describe the type of modification. Per FDA PCCP Final Guidance (Dec 2024, reissued Aug 2025), Section VI — Description of Modifications, a general PCCP covering 'software changes' does not authorize specific model architecture changes unless explicitly described." },
      { id: "P2", q: "Does the change fall within the predefined modification boundaries specified in the PCCP?", type: "yesnouncertain",
        skip: answers.P1 !== Answer.Yes,
        help: "The PCCP defines boundaries for authorized modifications. A change that exceeds those boundaries cannot be implemented under the PCCP." },
      { id: "P3", q: "Are the PCCP-specified acceptance criteria and validation protocol available for this change?", type: "yesno",
        skip: answers.P1 !== Answer.Yes || answers.P2 !== Answer.Yes,
        help: "Implementation under PCCP requires executing the validation protocol defined in the approved plan." },
      { id: "P4", q: "Is the PCCP-specified performance monitoring plan active and collecting data?", type: "yesno",
        skip: answers.P1 !== Answer.Yes || answers.P2 !== Answer.Yes || answers.P3 !== Answer.Yes,
        help: "Per FDA PCCP Final Guidance (Dec 2024, reissued Aug 2025), Section V.C — Implementing Modifications, an active performance monitoring plan is a prerequisite for PCCP implementation." },
      { id: "P5", q: "Considering all previous PCCP-implemented changes, does this additional change still fall within the cumulative impact boundaries of the PCCP?", type: "yesnouncertain",
        skip: answers.P1 !== Answer.Yes || answers.P2 !== Answer.Yes || answers.P3 !== Answer.Yes || answers.P4 !== Answer.Yes,
        help: "The PCCP Impact Assessment must evaluate risks 'individually and in combination' per FDA PCCP Final Guidance (Dec 2024, reissued Aug 2025), Section VIII — Impact Assessment. Even if this change is within scope, the cumulative effect of all PCCP-implemented changes must still be within boundaries. If no prior PCCP-implemented changes exist, answer 'Yes' and document that this is the first implementation under the PCCP." },
    ];

    case "D": return [
      { id: "D1", q: "Is the foundation or base model being changed (e.g., model version swap, provider change)?", type: "yesno",
        mlguidance: "Evidence to gather: model version identifiers (before/after), upstream release notes, embedding dimension changes, tokenizer changes. Run your full evaluation suite on the new base model BEFORE fine-tuning to measure baseline drift. Document upstream provider's change log if available.",
        help: "A base model swap is one of the highest-risk generative-AI changes. It should trigger a rigorous intended-use, risk, and performance reassessment, and many such changes will require a new submission unless they are appropriately bounded and authorized (for example, under an authorized PCCP)." },
      { id: "D2", q: "Are system instructions, reasoning templates, or other controlled prompt/configuration elements being modified?", type: "yesno",
        help: "For generative AI medical devices, prompt configurations function as part of the device design specification under general design control principles. FDA PCCP final guidance (Dec 2024, reissued Aug 2025), Section VI discusses describing modifications in the PCCP, which logically extends to prompt/configuration elements. Version control and validation of these elements is advisable for PCCP eligibility and design traceability; confirm current FDA expectations." },
      { id: "D3", q: "Is the retrieval-augmented generation (RAG) knowledge base or retrieval system changing?", type: "yesno",
        help: "Changes to the RAG knowledge base affect what information the model can access and reference for clinical decisions." },
      { id: "D4", q: "Are safety guardrails, content filters, or output constraints being modified?", type: "yesno",
        mlguidance: "Inventory all active guardrails: input validation, output filters, confidence thresholds, refusal rules, content classifiers. For each, document: is it being added, modified, or removed? What is the before/after behavior? Run adversarial test cases through the modified guardrail configuration.",
        help: "Guardrail removal or relaxation is high-risk. Adding guardrails is generally lower risk but still requires validation." },
      { id: "D5", q: "Has hallucination testing been performed on the modified system?", type: "yesno",
        draftRef: true,
        mlguidance: "Evidence expected: a structured hallucination test suite with domain-specific queries, factual accuracy scoring, and comparison against a reference corpus. Document hallucination rate (before/after), types of hallucinations observed, and whether any are clinically dangerous.",
        help: "Hallucination testing is important best practice for generative AI medical devices. While not explicitly mandated by FDA as a named requirement, consider it for demonstrating safety. A 'No' will generate a risk flag as a testing gap." },
    ];

    case "E": return [
      { id: "E1", q: "Does the training, validation, or test data adequately represent the device's intended patient population?", type: "yesnouncertain",
        draftRef: true,
        help: "FDA AI-DSF Lifecycle Guidance (Jan 2025 draft — not yet finalized; verify current status at fda.gov) recommends bias analysis across intended populations. Note: this recommendation derives from draft guidance, which does not establish legally enforceable requirements. Health Canada's MLMD guidance recommends bias and equity analysis for AI/ML devices, particularly regarding representativeness of training data and equitable performance across intended populations; the scope and depth should be proportionate to the device's risk classification." },
      { id: "E2", q: "Has subgroup performance been evaluated across relevant demographic groups (age, sex, ethnicity, comorbidities)?", type: "yesno",
        draftRef: true,
        mlguidance: "Report per-subgroup metrics: sensitivity, specificity, AUC, PPV, NPV broken down by age group, sex, ethnicity, and key comorbidities. Internal policy heuristic: flag any subgroup where performance drops >5% from aggregate — this threshold is not derived from any FDA regulation or guidance and should be calibrated to your device's risk profile. If sample size prevents subgroup analysis, document the gap and planned mitigation.",
        help: "Aggregate performance metrics can mask significant subgroup disparities. FDA draft guidance (AI-DSF Lifecycle, Jan 2025 — not yet finalized; verify current status at fda.gov) emphasizes subgroup analysis for AI/ML devices; scope and depth should be proportionate to the device's risk level, intended population, and the nature of the change. This is recommended best practice, not a current binding requirement for all submissions." },
      { id: "E3", q: "Does this change introduce data from new demographic populations not represented in the original authorization?", type: "yesnouncertain",
        help: "Adding new populations may expand the effective clinical scope and could constitute an intended use change." },
      { id: "E4", q: "Has the bias assessment from the original submission been updated to reflect this change?", type: "yesno",
        help: "The TPLC approach requires ongoing bias assessment. Changes that affect model behavior should trigger an updated bias analysis." },
      { id: "E5", q: "Does the change affect any bias mitigation strategies that were part of the original device design?", type: "yesnouncertain",
        help: "Removing or modifying bias mitigation measures is high-risk and may trigger additional regulatory scrutiny." },
    ];

    default: return [];
  }
};
