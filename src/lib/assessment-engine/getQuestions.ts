import { Answer, AuthPathway, Answers } from './types';
import { changeTaxonomy } from './changeTaxonomy';

/**
 * Derived-state shape expected by getQuestions / getBlocks.
 * Matches the return type of computeDerivedState.
 */
export interface DerivedState {
  hasGenAI: boolean;
  markets: string[];
  isMultiMarket: boolean;
  hasEU: boolean;
  hasUK: boolean;
  hasCanada: boolean;
  hasJapan: boolean;
  hasNonUSMarket: boolean;
  isCatIntendedUse: boolean;
  isCatGenAI: boolean;
  hasPCCP: boolean;
  isPMA: boolean;
  isDeNovo: boolean;
  is510k: boolean;
  euHighRisk: boolean;
  isIVD: boolean;
}

export interface Question {
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
  forcedValue?: any;
  consequencePreview?: any;
  mlguidance?: string;
  draftRef?: boolean;
  classificationGuidance?: string | null;
  boundaryNote?: string | null;
  selectedTypeData?: any;
}

export interface Block {
  id: string;
  label: string;
  shortLabel: string;
  icon: string;
}

/**
 * Pure extraction of getBlocks from regassess_v11.html lines 1221–1233.
 */
export const getBlocks = (answers: Answers, ds: DerivedState): Block[] => {
  const b: Block[] = [
    { id: "A", label: "What device are we assessing?", shortLabel: "Device Profile", icon: "shield" },
    { id: "B", label: "What changed?", shortLabel: "Change Classification", icon: "layers" },
    { id: "C", label: "Is this change regulatory-significant?", shortLabel: "Regulatory Significance", icon: "alert" },
  ];
  if (ds.hasPCCP && answers.B3 !== Answer.Yes && answers.B3 !== Answer.Uncertain) b.push({ id: "P", label: "Is this covered by the PCCP?", shortLabel: "PCCP Scope", icon: "checkCircle" });
  if (ds.hasGenAI) b.push({ id: "D", label: "GenAI-specific checks", shortLabel: "GenAI Supplemental", icon: "cpu" });
  if (ds.hasNonUSMarket) b.push({ id: "F", label: "Non-U.S. follow-up", shortLabel: "Jurisdictions", icon: "globe" });
  b.push({ id: "E", label: "Population impact check", shortLabel: "Bias & Equity", icon: "scale" });
  b.push({ id: "review", label: "Review & generate report", shortLabel: "Review", icon: "check" });
  return b;
};

/**
 * Pure extraction of getQuestions from regassess_v11.html lines 1237–1510.
 * Signature: getQuestions(blockId, answers, derivedState)
 *
 * The original was a closure over component state; this version takes
 * answers and derivedState as explicit parameters instead.
 */
export const getQuestions = (blockId: string, answers: Answers, ds: DerivedState): Question[] => {
  const { hasGenAI, hasEU, hasUK, hasCanada, hasJapan, hasNonUSMarket,
    isCatIntendedUse, hasPCCP, isPMA, isDeNovo, euHighRisk, markets } = ds;

  switch (blockId) {
    case "A": return [
      { id: "A_SEC1", sectionDivider: true, label: "Required for pathway accuracy", sublabel: "These fields directly determine the regulatory pathway and decision logic.", icon: "shield" },
      { id: "A1", q: "What is the current regulatory authorization pathway?", type: "single",
        options: ["510(k)", "De Novo", "PMA"],
        pathwayCritical: true,
        help: "The existing regulatory basis determines which change assessment framework applies. For software changes to De Novo-authorized devices that remain subject to 510(k) requirements, FDA's 510(k) change guidances are relevant; continued fit with the De Novo device type and special controls should also be checked." },
      { id: "A1b", q: "What is the current U.S. authorization identifier (e.g., K#, DEN#, P#)?", type: "text",
        pathwayCritical: true,
        help: "Anchors the assessment to a specific authorization record. Without this, the determination may not be reliable." },
      { id: "A1c", q: "What is the authorized baseline being used for comparison (e.g., cleared/approved version, released build, or design baseline)?", type: "text",
        pathwayCritical: true,
        help: "Regulatory reviewers compare the proposed change to a defined authorized baseline, not just the latest marketed build." },
      { id: "A1d", q: "Paste or summarize the currently authorized indications for use / intended purpose statement.", type: "text",
        pathwayCritical: true,
        help: "Required for the intended use comparison. Compare the proposed change against this exact statement." },
      { id: "A2", q: "Does the device have an FDA-authorized Predetermined Change Control Plan (PCCP)?", type: "yesno",
        pathwayCritical: true,
        help: "An authorized PCCP allows pre-approved modifications without a new submission — but only for changes within the PCCP's scope. Per FDORA §515C and FDA PCCP Final Guidance (Dec 2024, reissued Aug 2025)." },
      { id: "A3", q: "In which markets is the device currently authorized?", type: "multi",
        options: ["US", "EU", "UK", "Canada", "Japan", "China", "Other"],
        pathwayCritical: true,
        help: "Each jurisdiction has its own change assessment requirements. RegAssess provides a U.S.-primary determination plus jurisdiction-specific follow-up actions and escalation cues; local RA review is still required for each market." },
      { id: "A6", q: "What type of AI/ML technology does the device use?", type: "multi",
        options: ["Traditional ML (e.g., random forest, SVM)", "Deep Learning (e.g., CNN, RNN)", "Transformer / Attention-Based", "LLM / Foundation Model", "Generative AI", "Ensemble / Multi-Model", "Federated Learning"],
        pathwayCritical: true,
        infoNote: hasGenAI ? "Generative AI / LLM / Foundation Model detected — a dedicated Generative AI Supplemental assessment block will appear after the Regulatory Significance step. This covers base model changes, prompt modifications, RAG knowledge base, guardrails, hallucination testing, and adversarial testing." : null,
        help: "Selecting LLM / Foundation Model or Generative AI will add a dedicated 'Generative AI Supplemental' assessment block (Block D) later in the assessment flow, covering base model changes, prompt engineering, RAG, guardrails, hallucination testing, and explainability." },
      { id: "A_SEC2", sectionDivider: true, label: "Recommended for completeness", sublabel: "Improves assessment quality. Skipping reduces confidence but does not block the determination.", icon: "layers" },
      { id: "A1e", q: "What is the current marketed version / build identifier?", type: "text",
        help: "The marketed version may differ from the authorized baseline if post-market changes have been implemented. Identifying both helps assess cumulative drift." },
      { id: "A1f", q: "What are the relevant special controls or device-type constraints for this device?", type: "text",
        skip: answers.A1 !== AuthPathway.DeNovo,
        help: "De Novo classifications establish a new device type with specific special controls. Any change that moves the device outside these special controls may require a new De Novo request or a 510(k) to a different predicate. Enter the De Novo classification regulation number and key special controls." },
      { id: "A2b", q: "Briefly describe the authorized PCCP scope (change types and modification boundaries covered).", type: "text",
        skip: answers.A2 !== Answer.Yes,
        help: "Critical for verifying whether the current change falls within PCCP coverage." },
      { id: "A2c", q: "Is the PCCP implementation documentation current (PMA Annual Report per 21 CFR 814.84 for PMA devices; QMS records for 510(k)/De Novo devices)?", type: "yesno",
        skip: answers.A2 !== Answer.Yes,
        help: "Per FDA PCCP Final Guidance (Dec 2024, reissued Aug 2025) §V.C: PMA devices must report PCCP-implemented changes in PMA Annual Reports (21 CFR 814.84). For 510(k) and De Novo devices, FDA does not mandate a separate 'PCCP Annual Report' — maintain implementation documentation per your QMS. Address any outstanding reporting or documentation obligations promptly." },
      { id: "A4", q: "What is the EU MDR risk classification?", type: "single",
        skip: !hasEU,
        options: ["Class I", "Class IIa", "Class IIb", "Class III"],
        help: "EU MDR classification determines Notified Body involvement and potential EU AI Act obligations." },
      { id: "A5", q: "Is the device subject to third-party conformity assessment under MDR/IVDR?", type: "yesno",
        skip: !hasEU,
        help: "Under EU AI Act Article 6(1), AI systems that are safety components of — or are themselves — products covered by Annex I Union harmonisation legislation (including MDR 2017/745 and IVDR 2017/746) are classified as high-risk when that legislation requires third-party conformity assessment for placing on the market or putting into service. Obligations for Annex I medical devices apply from Aug 2, 2027 (note: subject to possible delay under pending EU Digital Omnibus proposal — verify current timeline)." },
      { id: "A5b", q: "Is this device an In Vitro Diagnostic (IVD)?", type: "yesno",
        skip: !hasEU,
        help: "IVD devices fall under EU IVDR 2017/746 instead of MDR 2017/745. The change assessment framework, classification, and Notified Body requirements differ. For IVDs, MDCG 2022-6 applies for IVDR Article 110(3) transitional provisions instead of MDCG 2020-3." },
      { id: "A6b", q: "What is the IEC 62304 software safety classification?", type: "single",
        options: ["Class A — No injury or damage to health possible", "Class B — Non-serious injury possible", "Class C — Death or serious injury possible"],
        help: "Software safety class determines documentation depth for the software lifecycle. A change that shifts the safety class has cascading implications." },
      { id: "A6c", q: "What is the SaMD risk category (IMDRF)?", type: "single",
        options: ["Category I (Inform — Non-serious)", "Category II (Inform — Serious / Drive — Non-serious)", "Category III (Treat/Diagnose — Non-serious / Drive — Serious)", "Category IV (Treat/Diagnose — Serious/Critical)", "Not applicable (not SaMD)"],
        help: "IMDRF SaMD risk categorization based on significance of information × state of healthcare situation. Used by multiple international regulators." },
      { id: "A7", q: "Does the device depend on any third-party models, APIs, or external AI services?", type: "yesno",
        help: "Third-party dependencies introduce change risks outside your direct control." },
      { id: "A7b", q: "Has the upstream provider notified you of any pending or recent model/API changes?", type: "yesnouncertain",
        skip: answers.A7 !== Answer.Yes,
        help: "Upstream provider changes (e.g., model version swap, API deprecation) are one of the highest-risk scenarios for AI/ML devices, especially GenAI." },
      { id: "A8", q: "How many changes have been implemented since the last regulatory submission?", type: "numeric",
        help: "Cumulative change count informs drift assessment. A high number of changes warrants closer review of whether the device's overall behavior has shifted from its cleared specification." },
    ];

    case "B": return [
      { id: "B1", q: "What category of change is being made?", type: "single",
        options: [...Object.keys(changeTaxonomy), "Other (not listed — describe below)"],
        help: "Select the category that best describes the change. This determines the available specific change types." },
      { id: "B2", q: "What is the specific type of change?", type: "single",
        options: answers.B1 ? (changeTaxonomy[answers.B1]?.types?.map((t: any) => t.name) || []) : [],
        dynamic: true, disabled: !answers.B1,
        help: answers.B1 ? "Select the specific change type within the selected category." : "Select a change category first.",
        classificationGuidance: answers.B1 ? changeTaxonomy[answers.B1]?.classificationGuidance : null,
        boundaryNote: answers.B1 ? changeTaxonomy[answers.B1]?.boundaryNote : null,
        selectedTypeData: (answers.B1 && answers.B2) ? changeTaxonomy[answers.B1]?.types?.find((t: any) => t.name === answers.B2) : null },
      { id: "B3", q: "Does this change affect the intended use or indications for use?", type: "yesnouncertain",
        critical: true,
        autoWarn: isCatIntendedUse ? "You selected 'Intended Use / Indications for Use' as the change category. This category frequently affects intended use — but you must explicitly confirm by comparing the proposed change against the authorized indications/intended-purpose statement word-by-word. Do not assume 'Yes' without that comparison." : null,
        forcedValue: null,
        consequencePreview: null,
        mlguidance: "Pull up the clearance letter and Indications for Use statement. Compare word-by-word: does the change expand the patient population, clinical setting, anatomical region, severity scope, or diagnostic capability? For GenAI: does expanded prompting ability or RAG content broaden effective clinical scope even if the stated IFU hasn't changed?",
        help: "The most consequential question in the assessment. Compare the proposed change against the exact authorized indications for use / intended purpose, labeling claims, population, clinical context, and outputs. Per FDA PCCP Final Guidance, PCCP-covered modifications should generally maintain the device's intended use, though FDA has acknowledged that certain limited IFU modifications may be appropriate on a case-by-case basis." },
      { id: "B3b", q: "Does this change affect the IEC 62304 software safety classification?", type: "yesnouncertain",
        help: "A safety class change (e.g., B → C) triggers additional software lifecycle documentation requirements and may affect the regulatory submission pathway." },
      { id: "B4", q: "Describe the change in detail.", type: "text",
        help: "Provide a clear description: what is changing, the scope, data sources affected, and components modified. This becomes part of your assessment record." },
      { id: "B5", q: "What is the trigger for this change?", type: "single",
        options: ["Manufacturer-initiated (planned improvement)", "Corrective action (CAPA)", "Preventive action (CAPA)", "Field safety corrective action / recall", "External dependency change (upstream provider)", "Regulatory requirement or commitment"],
        help: "CAPA-driven and recall-driven changes are flagged for expedited review. External dependency changes trigger third-party risk assessment." },
    ];

    case "C": {
      if (isPMA) {
        return [
          { id: "C_PMA1", q: "Does this change affect the safety or effectiveness of the device?", type: "yesnouncertain",
            skip: answers.B3 === Answer.Yes,
            mlguidance: "PMA threshold is lower than 510(k): any change that COULD affect safety or effectiveness. Run full validation suite and compare every metric. For AI/ML: check not just overall performance but subgroup stability, calibration drift, and failure mode distribution. If any metric shows a statistically meaningful shift, answer 'Yes' or 'Uncertain.'",
            help: "Under 21 CFR 814.39(a), any change affecting safety or effectiveness of a PMA-approved device requires a PMA supplement. See FDA PCCP Final Guidance (Dec 2024, reissued Aug 2025), Section V.B for establishing a PCCP through the PMA pathway." },
          { id: "C_PMA2", q: "Does this change affect the device labeling?", type: "yesno",
            skip: answers.B3 === Answer.Yes,
            help: "Labeling changes to PMA devices may require a PMA supplement depending on the nature of the change." },
          { id: "C_PMA3", q: "Does this change affect the manufacturing process or facility?", type: "yesno",
            skip: answers.B3 === Answer.Yes,
            help: "Manufacturing changes to PMA devices have specific supplement type requirements under 21 CFR 814.39." },
          { id: "C_PMA4", q: "What type of PMA supplement is anticipated?", type: "single",
            skip: answers.B3 !== Answer.Yes && answers.C_PMA1 !== Answer.Yes && answers.C_PMA1 !== Answer.Uncertain && answers.C_PMA2 !== Answer.Yes && answers.C_PMA3 !== Answer.Yes,
            options: ["Panel-Track Supplement (major change / typically substantial clinical evidence)", "180-Day Supplement (§814.39(a) — change affecting safety/effectiveness not requiring panel-track)", "Real-Time Supplement (minor change reviewed in real time; see FDA Real-Time PMA Supplements guidance)", "Special PMA Supplement — Changes Being Effected (§814.39(d) — certain safety-enhancing labeling or manufacturing changes)", "30-Day PMA Supplement (§814.39(e) — only when FDA has specifically advised this alternate submission)", "30-Day Notice (§814.39(f) — qualifying manufacturing procedure/method changes only)"],
            help: "Supplement type depends on the nature and scope of the change:\n• Panel-Track: Major changes, often including new indications for use or other changes typically needing substantial clinical evidence.\n• 180-Day: Changes affecting safety or effectiveness that do not fit a more specific alternative.\n• Real-Time: Certain minor changes that FDA agrees to review through the real-time process.\n• Special — Changes Being Effected: Certain safety-enhancing labeling or manufacturing changes under §814.39(d).\n• 30-Day PMA Supplement: An alternate submission under §814.39(e), only when FDA has specifically advised that this route is permitted.\n• 30-Day Notice: Certain manufacturing procedure or method changes under §814.39(f). If the notice is not adequate, FDA may require a 135-day PMA supplement.\nMinor changes that do not affect safety or effectiveness may instead be reportable in the PMA annual/periodic report under §814.39(b) and §814.84." },
          { id: "C_PMA5", q: "Is this a significant change under EU MDR? (Note: MDCG 2020-3 applies to legacy devices under Article 120. For fully MDR-certified devices, assess under applicable conformity assessment procedures.)", type: "yesnouncertain",
            skip: !hasEU || answers.B3 === Answer.Yes,
            help: "EU MDR defines 'significant change' separately from FDA criteria. MDCG 2020-3 Rev.1 applies specifically to legacy devices transitioning under Article 120. For fully MDR-certified devices, the change assessment follows applicable conformity assessment procedures. For IVDs, see MDCG 2022-6." },
          { id: "C_PMA6", q: "Does this modification meet the EU AI Act definition of 'substantial modification'?", type: "yesnouncertain",
            skip: !euHighRisk || answers.B3 === Answer.Yes,
            help: "Under the EU AI Act Article 43(4), substantial modifications to high-risk AI systems may require a new conformity assessment. Note: pre-determined changes that were foreseen, assessed, and documented at initial conformity assessment do not constitute 'substantial modifications' under Article 3(23) (MDCG 2025-6)." },
          { id: "C_PMA6b", q: "Was this change type pre-determined and assessed during the initial EU conformity assessment?", type: "yesno",
            skip: !euHighRisk || answers.C_PMA6 !== Answer.Yes,
            help: "Per MDCG 2025-6 / AIB 2025-1 (June 2025): changes pre-determined by the manufacturer and documented in Annex IV technical documentation do NOT constitute a substantial modification under the AI Act." },
        ];
      }

      return [
        { id: "C0_DN1", q: "Does the modified device still fit within the De Novo classification device type and special controls?", type: "yesnouncertain",
          skip: answers.A1 !== AuthPathway.DeNovo || answers.B3 === Answer.Yes,
          help: "Before assessing significance under the 510(k)-based change framework, first confirm the modified device still falls within the device type established by the De Novo authorization. If the device no longer fits the device type or special controls, a 510(k) to a different predicate or a new De Novo request may be required instead." },
        { id: "C0_DN2", q: "Can the modified device comply with all special controls specified in the De Novo classification order?", type: "yesnouncertain",
          skip: answers.A1 !== AuthPathway.DeNovo || answers.B3 === Answer.Yes || answers.C0_DN1 === Answer.Yes,
          help: "Special controls are the regulatory basis for the De Novo classification. If the modified device cannot comply with one or more special controls, the modification may require a different regulatory strategy. An FDA Pre-Submission (Q-Sub) is strongly recommended." },
        { id: "C1", q: "Is this change solely to strengthen cybersecurity with no impact on device function or performance?", type: "yesnouncertain",
          skip: answers.B3 === Answer.Yes,
          help: "Pure cybersecurity patches with verified zero performance impact do not require a new 510(k). Per FDA Software Change Guidance (Oct 2017), Section V, Flowchart Question 1 — Cybersecurity Exemption. FDA requires the change to be 'solely to strengthen cybersecurity' with no other impact, supported by appropriate analysis/verification/validation. This exemption requires affirmative demonstration — if uncertain, select 'Uncertain' and the assessment will continue to the full significance evaluation. Note: Cybersecurity in Medical Devices: Quality Management System Considerations and Content of Premarket Submissions Guidance (Feb 2026), Section VII addresses §524B requirements for cyber devices." },
        { id: "C2", q: "Is this change solely to restore the device to its most recently cleared specification (i.e., a bug fix)?", type: "yesnouncertain",
          skip: answers.B3 === Answer.Yes || answers.C1 === Answer.Yes,
          help: "Bug fixes restoring the original cleared specifications do not require a new 510(k). Per FDA Software Change Guidance (Oct 2017), Section V, Flowchart Question 2 — Restore-to-Specification Exemption. This exemption requires affirmative demonstration — if uncertain whether the change restores to a known cleared state, select 'Uncertain' and the assessment will continue to the full significance evaluation." },
        { id: "C3", q: "Does this change introduce a new or modified risk of harm with potential for patient injury?", type: "yesnouncertain",
          skip: answers.B3 === Answer.Yes || answers.C1 === Answer.Yes || answers.C2 === Answer.Yes,
          infoNote: (answers.C3 === Answer.Yes || answers.C3 === Answer.Uncertain) ? "Because this question was answered 'Yes' or 'Uncertain,' the remaining significance sub-questions (C4–C6) are not shown — the pathway determination is already triggered. However, for a complete regulatory record (Letter to File or submission), you should still evaluate and document all applicable risk dimensions (new hazardous situations, risk control impacts, and clinical performance effects) outside this tool." : null,
          mlguidance: "Could this change cause the model to miss diagnoses it previously caught? Run your existing test set through both versions — if the change creates a new clinically relevant error pattern, worsens a known failure mode, or leaves patient-harm risk unresolved, answer 'Yes' or 'Uncertain.'",
          help: "Review your risk management file (ISO 14971 §7). A new or modified cause of a hazardous situation with significant unmitigated harm requires a new submission. Per FDA Software Change Guidance (Oct 2017), Section V, Flowchart Question 3 — risk assessment. Note: FDA's guidance presents Q3 as a single question. RegAssess decomposes it into three sub-questions (C3, C4, C5) for granularity. When documenting for regulatory purposes, map all three back to Q3. This sub-question addresses new or modified causes of harm." },
        { id: "C4", q: "Does this change create an entirely new hazardous situation not present in the current risk analysis?", type: "yesnouncertain",
          skip: answers.B3 === Answer.Yes || answers.C1 === Answer.Yes || answers.C2 === Answer.Yes || answers.C3 === Answer.Yes,
          mlguidance: "Review your risk management file for the current hazard list. Does this change create a failure mode NOT already documented? For architecture changes: new model families have different failure modes (e.g., transformers hallucinate differently than CNNs). For GenAI: check for novel hazard categories like fabricated clinical recommendations.",
          help: "Distinct from the Cause of Harm question: this asks whether the change introduces an entirely new type of risk scenario. Per FDA Software Change Guidance (Oct 2017), Section V, Flowchart Question 3 — risk assessment. Note: FDA's guidance presents Q3 as a single question; RegAssess decomposes it into sub-questions (C3, C4, C5) for granularity. When documenting for regulatory purposes, map all three back to Q3. This sub-question addresses new hazardous situations." },
        { id: "C5", q: "Does this change create or necessitate a change to a risk control measure for a hazardous situation with significant harm potential?", type: "yesnouncertain",
          skip: answers.B3 === Answer.Yes || answers.C1 === Answer.Yes || answers.C2 === Answer.Yes || answers.C3 === Answer.Yes || answers.C4 === Answer.Yes,
          mlguidance: "Check your risk control matrix. If this change modifies guardrails, safety filters, confidence thresholds, human-in-the-loop overrides, or output constraints, those are risk controls. Also check: does the change weaken monitoring or anomaly detection that served as a risk mitigation?",
          help: "If the change modifies, weakens, or removes an existing risk control, it may trigger regulatory significance. Per FDA Software Change Guidance (Oct 2017), Section V, Flowchart Question 3 — risk assessment. Note: FDA's guidance presents Q3 as a single question; RegAssess decomposes it into sub-questions (C3, C4, C5) for granularity. When documenting for regulatory purposes, map all three back to Q3. This sub-question addresses risk control impact." },
        { id: "C6", q: "Could this change significantly affect clinical functionality or performance specifications?", type: "yesnouncertain",
          skip: answers.B3 === Answer.Yes || answers.C1 === Answer.Yes || answers.C2 === Answer.Yes || answers.C3 === Answer.Yes || answers.C4 === Answer.Yes || answers.C5 === Answer.Yes,
          mlguidance: "Compare performance metrics before and after on your holdout test set. If sensitivity, specificity, or any key metric changes beyond the predefined acceptance range, answer 'Yes.'",
          help: "Changes that significantly affect clinical functionality or performance specifications require a new submission. Per FDA Software Change Guidance (Oct 2017), Section V, Flowchart Question 4 — could the change significantly affect clinical functionality or performance specifications." },
        { id: "C8", q: "Is this a significant change under EU MDR? (Note: MDCG 2020-3 applies to legacy devices under Article 120 transitional provisions. For fully MDR-certified devices, assess under applicable conformity assessment procedures.)", type: "yesnouncertain",
          skip: !hasEU || answers.B3 === Answer.Yes,
          mlguidance: "EU 'significant change' criteria differ from FDA. Check: does this change affect the device's intended purpose, design or manufacturing specifications, or its conformity with general safety and performance requirements? Does it require new clinical data? Consult your EU technical documentation and Declaration of Conformity.",
          help: "EU MDR defines 'significant change' separately from FDA criteria. MDCG 2020-3 Rev.1, Section 3 addresses legacy devices transitioning under Article 120 of MDR 2017/745; for fully MDR-certified devices, the change assessment follows applicable conformity assessment procedures. For IVDs, see MDCG 2022-6 under IVDR 2017/746, Article 110(3). Consider: does it affect intended purpose, design/specifications, or require new clinical data?" },
        { id: "C8b", q: "Specifically, does this change affect the intended purpose as defined in the EU Declaration of Conformity?", type: "yesno",
          skip: !hasEU || answers.B3 === Answer.Yes || answers.C8 !== Answer.Uncertain,
          help: "When the overall MDR significant change assessment is uncertain, decomposing into specific MDCG 2020-3 criteria helps resolve ambiguity." },
        { id: "C8c", q: "Does this change require new or additional clinical evidence beyond existing data?", type: "yesnouncertain",
          skip: !hasEU || answers.B3 === Answer.Yes || answers.C8 === Answer.No,
          help: "If new clinical evidence is needed, Notified Body notification is almost certainly required regardless of other factors." },
        { id: "C9", q: "Does this modification meet the EU AI Act definition of 'substantial modification'?", type: "yesnouncertain",
          skip: !euHighRisk || answers.B3 === Answer.Yes,
          help: "Under EU AI Act (Regulation 2024/1689), Article 43(4), substantial modifications to high-risk AI systems may require a new conformity assessment. The definition of 'substantial modification' is in Article 3(23): a change not foreseen or planned by the provider that affects compliance or modifies the intended purpose. Pre-determined changes properly assessed and documented at initial conformity assessment do not meet this definition. Note: obligations for Annex I medical devices apply from Aug 2, 2027 (subject to possible delay under pending EU Digital Omnibus proposal — verify current timeline). See MDCG 2025-6 / AIB 2025-1 for MDR/AI Act interplay." },
        { id: "C9b", q: "Was this change type pre-determined and assessed during the initial EU conformity assessment?", type: "yesno",
          skip: !euHighRisk || answers.C9 !== Answer.Yes,
          help: "Per MDCG 2025-6 / AIB 2025-1 (June 2025), Q&A 4.3: pre-determined changes documented in EU AI Act Annex IV, point 2(f) technical documentation do NOT constitute a substantial modification under Article 3(23)." },
        { id: "C10", q: "Considering all changes since last submission, has the device's overall behavior materially drifted from its cleared specification?", type: "yesnouncertain",
          skip: !answers.A8 || parseInt(answers.A8) === 0,
          help: "Even if each individual change was non-significant, the cumulative effect may have shifted the device from its cleared state." },
        { id: "C11", q: "Is substantial equivalence to the predicate device still supportable after this change?", type: "yesnouncertain",
          skip: answers.A1 !== AuthPathway.FiveOneZeroK || answers.C10 !== Answer.Yes,
          help: "Compare the current device specification (including all accumulated changes) against the predicate." },
      ];
    }

    case "P": return [
      { id: "P1", q: "Is this specific change type explicitly described in the authorized PCCP?", type: "yesno",
        help: "The PCCP must specifically describe the type of modification. Per FDA PCCP Final Guidance (Dec 2024, reissued Aug 2025), Section VI — Description of Modifications, a general PCCP covering 'software changes' does not authorize specific model architecture changes unless explicitly described." },
      { id: "P2", q: "Does the change fall within the predefined modification boundaries specified in the PCCP?", type: "yesnouncertain",
        skip: answers.P1 !== Answer.Yes,
        help: "The PCCP defines boundaries for authorized modifications. A change that exceeds those boundaries cannot be implemented under the PCCP." },
      { id: "P3", q: "Are the PCCP-specified acceptance criteria and validation protocol available for this change?", type: "yesno",
        skip: answers.P1 !== Answer.Yes || answers.P2 === Answer.No,
        help: "Implementation under PCCP requires executing the validation protocol defined in the approved plan." },
      { id: "P4", q: "Is the PCCP-specified performance monitoring plan active and collecting data?", type: "yesno",
        skip: answers.P1 !== Answer.Yes || answers.P2 === Answer.No || answers.P3 !== Answer.Yes,
        help: "Per FDA PCCP Final Guidance (Dec 2024, reissued Aug 2025), Section V.C — Implementing Modifications, an active performance monitoring plan is a prerequisite for PCCP implementation." },
      { id: "P5", q: "Considering all previous PCCP-implemented changes, does this additional change still fall within the cumulative impact boundaries of the PCCP?", type: "yesnouncertain",
        skip: answers.P1 !== Answer.Yes || answers.P2 === Answer.No || answers.P3 !== Answer.Yes || answers.P4 !== Answer.Yes,
        help: "The PCCP Impact Assessment must evaluate risks 'individually and in combination' per FDA PCCP Final Guidance (Dec 2024, reissued Aug 2025), Section VIII — Impact Assessment. Even if this change is within scope, the cumulative effect of all PCCP-implemented changes must still be within boundaries." },
      { id: "P6", q: "Does the device labeling require updating to reflect this PCCP-implemented change?", type: "yesno",
        skip: answers.P1 !== Answer.Yes || answers.P2 === Answer.No || answers.P3 !== Answer.Yes,
        help: "FDA may require labeling updates for PCCP-implemented changes, including summaries of the change, supporting evidence, impacted inputs/outputs, and version history." },
    ];

    case "D": return [
      { id: "D1", q: "Is the foundation or base model being changed (e.g., model version swap, provider change)?", type: "yesno",
        mlguidance: "Evidence to gather: model version identifiers (before/after), upstream release notes, embedding dimension changes, tokenizer changes. Run your full evaluation suite on the new base model BEFORE fine-tuning to measure baseline drift. Document upstream provider's change log if available.",
        help: "A base model swap is one of the highest-risk generative-AI changes. It should trigger a rigorous intended-use, risk, and performance reassessment, and many such changes will require a new submission unless they are appropriately bounded and authorized (for example, under an authorized PCCP)." },
      { id: "D1b", q: "Is this base model change initiated by the upstream provider (not by the device manufacturer)?", type: "yesno",
        skip: answers.D1 !== Answer.Yes,
        help: "Upstream-initiated changes are particularly high-risk because the manufacturer may not have full visibility into what changed in the model." },
      { id: "D2", q: "Are system instructions, reasoning templates, or other controlled prompt/configuration elements being modified?", type: "yesno",
        help: "For generative AI medical devices, prompt configurations function as part of the device design specification under general design control principles. FDA PCCP Final Guidance (Dec 2024, reissued Aug 2025), Section VI discusses describing modifications in the PCCP, which logically extends to prompt/configuration elements. Version control and validation of these elements is strongly recommended best practice for maintaining PCCP eligibility and design traceability." },
      { id: "D3", q: "Is the retrieval-augmented generation (RAG) knowledge base or retrieval system changing?", type: "yesno",
        help: "Changes to the RAG knowledge base affect what information the model can access and reference for clinical decisions." },
      { id: "D4", q: "Are safety guardrails, content filters, or output constraints being modified?", type: "yesno",
        mlguidance: "Inventory all active guardrails: input validation, output filters, confidence thresholds, refusal rules, content classifiers. For each, document: is it being added, modified, or removed? What is the before/after behavior? Run adversarial test cases through the modified guardrail configuration.",
        help: "Guardrail removal or relaxation is high-risk. Adding guardrails is generally lower risk but still requires validation." },
      { id: "D5", q: "Has hallucination testing been performed on the modified system?", type: "yesno",
        draftRef: true,
        mlguidance: "Evidence expected: a structured hallucination test suite with domain-specific queries, factual accuracy scoring, and comparison against a reference corpus. Document hallucination rate (before/after), types of hallucinations observed, and whether any are clinically dangerous.",
        help: "Hallucination testing is a critical best practice for generative AI medical devices. While not explicitly mandated by FDA as a named requirement, it is strongly recommended for demonstrating safety. A 'No' will generate a risk flag as a testing gap." },
      { id: "D6", q: "Has adversarial (red-team) testing been performed on the modified system?", type: "yesno",
        draftRef: true,
        help: "Adversarial/red-team testing probes for failure modes and malicious inputs. Recommended best practice per industry consensus; not explicitly enumerated as an FDA requirement. A 'No' will generate a risk flag as a testing gap." },
      { id: "D7", q: "Are all prompts, templates, and LLM configurations under version control as controlled documents in the QMS?", type: "yesno",
        help: "Version control of prompts and configurations is strongly recommended best practice for generative AI devices. Under general design control principles (QMSR / ISO 13485), elements that affect device output should be controlled documents. FDA PCCP Final Guidance (Dec 2024, reissued Aug 2025) §VI discusses describing modifications, which logically encompasses prompt elements — but FDA has not issued a separate, explicit requirement naming prompt version control. Lack of version control undermines PCCP scope verification and design traceability." },
      { id: "D8", q: "Does the change affect the explainability or interpretability of the model's outputs to clinicians?", type: "yesnouncertain",
        draftRef: true,
        help: "The FDA AI-DSF Lifecycle Guidance (Jan 2025 draft — not yet finalized; verify current status at fda.gov) emphasizes clinically relevant explanations appropriate for intended users. Changes that reduce explainability may affect safety. Note: this recommendation derives from draft guidance, which does not establish legally enforceable requirements." },
      { id: "D9", q: "For EU-market devices: does the change affect compliance with EU AI Act transparency requirements (Article 13)?", type: "yesnouncertain",
        skip: !hasEU,
        help: "The EU AI Act requires high-risk AI systems to be designed to ensure appropriate transparency, including user instructions. Changes to explainability may trigger re-assessment." },
    ];

    case "F": return [
      { id: "F1", q: "Is this device an In Vitro Diagnostic (IVD)?", type: "yesno",
        help: "IVD devices fall under EU IVDR 2017/746 instead of MDR 2017/745, and may have different PMDA/Health Canada classification." },
      { id: "F2", q: "Is the device authorized in Canada?", type: "yesno",
        skip: !hasCanada, help: "Health Canada's MLMD guidance addresses AI/ML device changes, including recommendations for bias and equity analysis proportionate to device risk." },
      { id: "F3", q: "What is the Health Canada device license class?", type: "single",
        skip: answers.F2 !== Answer.Yes, options: ["Class II", "Class III", "Class IV"],
        help: "Class III/IV devices require a license amendment for significant changes under the Medical Devices Regulations SOR/98-282." },
      { id: "F4", q: "Is the device authorized in Japan?", type: "yesno",
        skip: !hasJapan, help: "PMDA classification determines the partial change approval pathway." },
      { id: "F5", q: "What is the PMDA device classification?", type: "single",
        skip: answers.F4 !== Answer.Yes, options: ["Class I", "Class II", "Class III", "Class IV"],
        help: "Class III/IV devices require PMDA approval for partial changes." },
      { id: "F7", q: "Is the device authorized in the UK (MHRA)?", type: "yesno",
        skip: !hasUK, help: "The UK MHRA is developing its own AI/ML device framework post-Brexit." },
      { id: "F7b", q: "Is the current UK authorization based on CE marking under the recognition route?", type: "yesno",
        skip: answers.F7 !== Answer.Yes,
        help: "If the UK authorization relies on EU CE marking, changes to the EU conformity status may cascade to UK market access." },
      { id: "F8", q: "Is the device authorized in China (NMPA)?", type: "yesno",
        skip: !markets.includes("China"), help: "NMPA has its own AI/ML classification and significant change requirements." },
      { id: "F8b", q: "What is the NMPA device classification?", type: "single",
        skip: answers.F8 !== Answer.Yes, options: ["Class I", "Class II", "Class III"],
        help: "NMPA Class II/III devices require registration change or supplemental approval for significant changes." },
      { id: "F6", q: "Has a jurisdiction conflict analysis been performed across all authorized markets?", type: "single",
        options: ["Yes — no conflicts identified", "Yes — conflicts identified (describe in notes)", "No — not yet performed"],
        help: "Multi-jurisdiction devices may face conflicting regulatory requirements (e.g., EU requires Notified Body notification while US determines Letter to File)." },
    ];

    case "E": return [
      { id: "E1", q: "Does the training, validation, or test data adequately represent the device's intended patient population?", type: "yesnouncertain",
        draftRef: true,
        help: "FDA AI-DSF Lifecycle Guidance (Jan 2025 draft — not yet finalized; verify current status at fda.gov) recommends bias analysis across intended populations. Note: this recommendation derives from draft guidance, which does not establish legally enforceable requirements. Health Canada's MLMD guidance recommends bias and equity analysis for AI/ML devices, particularly regarding representativeness of training data and equitable performance across intended populations; the scope and depth should be proportionate to the device's risk classification." },
      { id: "E2", q: "Has subgroup performance been evaluated across relevant demographic groups (age, sex, ethnicity, comorbidities)?", type: "yesno",
        draftRef: true,
        mlguidance: "Report per-subgroup metrics: sensitivity, specificity, AUC, PPV, NPV broken down by age group, sex, ethnicity, and key comorbidities. Flag any subgroup where performance drops >5% from aggregate. If sample size prevents subgroup analysis, document the gap and planned mitigation.",
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
