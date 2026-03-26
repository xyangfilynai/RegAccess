import { Answer, AuthPathway, Pathway, Answers } from './types';

export const computeDetermination = (ans: Answers) => {
  const _isIntendedUseChange = ans.B3 === Answer.Yes;
  const _isIntendedUseUncertain = ans.B3 === Answer.Uncertain;
  const _isPMA = ans.A1 === AuthPathway.PMA;
  // Cybersecurity and restore-to-spec exemptions are 510(k) framework concepts (FDA-SW-510K-2017).
  // They do not apply to PMA devices — PMA uses 21 CFR 814.39 safety/effectiveness analysis.
  const _isCyberOnly = !_isPMA && !_isIntendedUseChange && !_isIntendedUseUncertain && ans.C1 === Answer.Yes;
  const _isBugFix = !_isPMA && !_isIntendedUseChange && !_isIntendedUseUncertain && !_isCyberOnly && ans.C2 === Answer.Yes;
  const _isDeNovo = ans.A1 === AuthPathway.DeNovo;
  const _hasPCCP = ans.A2 === Answer.Yes;

  const _deNovoDeviceTypeFitFailed = _isDeNovo && !_isIntendedUseChange && !_isIntendedUseUncertain &&
    (ans.C0_DN1 === Answer.No || ans.C0_DN2 === Answer.No);
  const _deNovoDeviceTypeFitUncertain = _isDeNovo && !_isIntendedUseChange && !_isIntendedUseUncertain &&
    (ans.C0_DN1 === Answer.Uncertain || ans.C0_DN2 === Answer.Uncertain);

  const _baselineMissing = !ans.A1b || !ans.A1c || !ans.A1d;
  const _baselineIncomplete = _baselineMissing;

  const sigAnswers = [ans.C3, ans.C4, ans.C5, ans.C6];
  const _baseSignificant = !_isPMA && !_isIntendedUseUncertain && (
    sigAnswers.includes(Answer.Yes) || sigAnswers.includes(Answer.Uncertain)
  );
  const _hasUncertainSignificance = !_isPMA && !_isIntendedUseUncertain && sigAnswers.includes(Answer.Uncertain);
  const _allSignificanceNo = !_isPMA && !_isIntendedUseChange && !_isIntendedUseUncertain &&
    !_isCyberOnly && !_isBugFix &&
    ans.C3 === Answer.No && ans.C4 === Answer.No && ans.C5 === Answer.No && ans.C6 === Answer.No;

  // C10 is only shown when A8 > 0 (changes since last submission).
  // Guard against stale C10/C11 answers if the user corrects A8 to 0.
  const _hasChangesSinceLastSub = !!ans.A8 && parseInt(ans.A8) > 0;
  const _cumulativeEscalation = !_isPMA && _hasChangesSinceLastSub && (ans.C10 === Answer.Yes || ans.C10 === Answer.Uncertain);
  const _seNotSupportable = !_isPMA && _hasChangesSinceLastSub && ans.C11 === Answer.No;
  const _seUncertain = !_isPMA && _hasChangesSinceLastSub && ans.C11 === Answer.Uncertain;
  const _needsCumulativeSEQuestion = !_isPMA && _hasChangesSinceLastSub && ans.A1 === AuthPathway.FiveOneZeroK &&
    !_isIntendedUseChange && !_isIntendedUseUncertain && !_isCyberOnly && !_isBugFix &&
    ans.C3 === Answer.No && ans.C4 === Answer.No && ans.C5 === Answer.No && ans.C6 === Answer.No &&
    ans.C10 === Answer.Yes && ![Answer.Yes, Answer.No, Answer.Uncertain].includes(ans.C11);

  // Cumulative drift with unresolved uncertainty must not fall through to doc-only.
  // C10=Uncertain: drift question itself is unresolved → incomplete.
  // C10=Yes, De Novo (C11 never shown): drift confirmed but no SE resolution mechanism → incomplete.
  // C10=Yes, 510k, C11 pending: already handled by _needsCumulativeSEQuestion.
  // C10=Yes, C11=No: _seNotSupportable makes _isSignificant=true → New Submission (not affected here).
  // C10=Yes, C11=Yes: SE supportable → Letter to File with consistency warning is acceptable.
  const _cumulativeDriftUnresolved = _cumulativeEscalation && _allSignificanceNo && !_seNotSupportable && (
    ans.C10 === Answer.Uncertain ||
    ![Answer.Yes, Answer.No].includes(ans.C11)
  );

  const _significanceIncomplete = !_isPMA && !_isIntendedUseChange && !_isIntendedUseUncertain &&
    !_isCyberOnly && !_isBugFix && (
      (!_baseSignificant && !_allSignificanceNo) ||
      _deNovoDeviceTypeFitUncertain ||
      _seUncertain ||
      _needsCumulativeSEQuestion ||
      _cumulativeDriftUnresolved
    );

  const _genAIHighImpactChange = ans.D1 === Answer.Yes || ans.D4 === Answer.Yes;

  const _consistencyIssues: string[] = [];
  // GenAI consistency checks — apply to all pathways including PMA.
  // For 510(k)/De Novo, cross-reference against C3-C6 significance answers.
  // For PMA, cross-reference against C_PMA1 safety/effectiveness answer.
  if (!_isPMA && ans.D4 === Answer.Yes && ans.C5 === Answer.No) {
    _consistencyIssues.push("A GenAI guardrail / safety filter change was marked YES, but the risk-control significance question was marked NO. Reassess C5 before relying on the determination.");
  }
  if (_isPMA && ans.D4 === Answer.Yes && ans.C_PMA1 === Answer.No) {
    _consistencyIssues.push("A GenAI guardrail / safety filter change was marked YES, but the PMA safety/effectiveness question was marked NO. Guardrail changes directly affect risk controls — reassess C_PMA1 before relying on the determination.");
  }
  if (!_isPMA && ans.D1 === Answer.Yes && ans.C3 === Answer.No && ans.C4 === Answer.No && ans.C5 === Answer.No && ans.C6 === Answer.No) {
    _consistencyIssues.push("A foundation/base model change was marked non-significant across all U.S. significance questions. This is unusual and should be re-reviewed against performance, risk, and intended-use baselines.");
  }
  if (_isPMA && ans.D1 === Answer.Yes && ans.C_PMA1 === Answer.No) {
    _consistencyIssues.push("A foundation/base model change was reported, but the PMA safety/effectiveness question was marked NO. Base model swaps almost always affect safety or effectiveness — reassess C_PMA1 before relying on the determination.");
  }
  if (!_isPMA && (ans.D2 === Answer.Yes || ans.D3 === Answer.Yes) && ans.C3 === Answer.No && ans.C4 === Answer.No && ans.C5 === Answer.No && ans.C6 === Answer.No) {
    _consistencyIssues.push("A prompt or RAG knowledge-base change was marked non-significant across all U.S. significance questions. Confirm the clinical behavior, risk-control, and performance rationale before closing as Letter to File.");
  }
  if (_isPMA && (ans.D2 === Answer.Yes || ans.D3 === Answer.Yes) && ans.C_PMA1 === Answer.No) {
    _consistencyIssues.push("A prompt or RAG knowledge-base change was reported, but the PMA safety/effectiveness question was marked NO. Prompt and RAG changes can alter clinical behavior — reassess C_PMA1 before relying on the determination.");
  }
  if (ans.E3 === Answer.Yes && ans.B3 === Answer.No) {
    _consistencyIssues.push("New demographic populations were introduced while intended-use impact was marked NO. Confirm that this does not expand the authorized population or effective clinical scope.");
  }
  if (_cumulativeEscalation && _allSignificanceNo) {
    _consistencyIssues.push("Cumulative drift / substantial-equivalence answers conflict with an otherwise non-significant U.S. assessment. Reassess against the last authorized baseline before finalizing.");
  }
  if (_deNovoDeviceTypeFitFailed && _allSignificanceNo) {
    _consistencyIssues.push("The modified device may no longer fit the De Novo device type / special controls, but all U.S. significance questions were marked non-significant. The device-type fit concern takes priority — an FDA Pre-Submission is strongly recommended before closing as Letter to File.");
  }
  if (_deNovoDeviceTypeFitUncertain) {
    _consistencyIssues.push("The modified device\u2019s continued fit with the De Novo device type / special controls is uncertain. Resolve this with expert review or an FDA Pre-Submission before relying on a non-submission pathway.");
  }
  if (_isIntendedUseUncertain) {
    _consistencyIssues.push("Intended use impact is marked Uncertain. This uncertainty must be resolved through RA/clinical expert review or an FDA Pre-Submission (Q-Sub) before relying on any pathway determination. Do not treat this assessment as a final regulatory conclusion.");
  }
  // C1/C2 exemptions are 510(k)/De Novo concepts — only warn if not PMA (avoids stale answer false positives)
  if (!_isPMA && ans.C1 === Answer.Uncertain) {
    _consistencyIssues.push("Cybersecurity exemption eligibility is uncertain. The exemption requires affirmative demonstration that the change is solely to strengthen cybersecurity with zero functional impact. Because this could not be confirmed, the assessment continues to the full significance evaluation. Resolve the uncertainty before claiming exemption in any regulatory documentation.");
  }
  if (!_isPMA && ans.C2 === Answer.Uncertain) {
    _consistencyIssues.push("Restore-to-specification exemption eligibility is uncertain. The exemption requires affirmative demonstration that the change restores the device to a known, documented, cleared state. Because this could not be confirmed, the assessment continues to the full significance evaluation.");
  }
  if (ans.B1 === "Post-Market Surveillance" && (ans.B2 || "").includes("Monitoring threshold")) {
    if (!_isPMA && ans.C5 === Answer.No) {
      _consistencyIssues.push("A monitoring threshold change was reported with no risk-control impact. If the change weakens monitoring sensitivity, it may affect an existing risk control measure. Reassess C5.");
    }
    if (_isPMA && ans.C_PMA1 === Answer.No) {
      _consistencyIssues.push("A monitoring threshold change was reported, but the PMA safety/effectiveness question was marked NO. If the change weakens monitoring sensitivity, it may affect safety or effectiveness. Reassess C_PMA1.");
    }
  }
  if (_baselineIncomplete) {
    _consistencyIssues.push("One or more baseline fields (authorization identifier, baseline version, or authorized IFU statement) are missing. The determination may be unreliable without a defined authorized baseline for comparison. This is flagged as 'Evidence Missing / Expert Judgment Required.'");
  }
  if (_hasUncertainSignificance && _baseSignificant && !_isIntendedUseChange && !_isIntendedUseUncertain) {
    _consistencyIssues.push("One or more significance questions were answered 'Uncertain.' RegAccess's internal conservative policy treats unresolved significance uncertainty as requiring a submission — this is NOT a direct regulatory requirement but a risk-based escalation rule. Resolve the uncertainty through additional evidence, expert review, or FDA Pre-Submission before treating the pathway as final.");
  }
  if (_isPMA && ans.C_PMA1 === Answer.Uncertain) {
    _consistencyIssues.push("The PMA safety/effectiveness question was answered 'Uncertain.' RegAccess's internal conservative policy treats unresolved PMA uncertainty as requiring a supplement — this is NOT a direct regulatory mandate but a risk-based escalation. Resolve the uncertainty before treating the pathway as final.");
  }
  if (_isPMA && ans.C_PMA2 === Answer.Yes && ans.C_PMA1 === Answer.No) {
    _consistencyIssues.push("A PMA labeling change was reported while safety/effectiveness impact was marked NO. Confirm the labeling change is purely editorial or otherwise does not affect safety or effectiveness; otherwise a PMA supplement may still be required under 21 CFR 814.39(a).");
  }
  if (_isPMA && ans.C_PMA3 === Answer.Yes && ans.C_PMA1 === Answer.No) {
    _consistencyIssues.push("A PMA manufacturing or facility change was reported while safety/effectiveness impact was marked NO. Confirm the change is periodic-reportable under 21 CFR 814.39(b) or eligible for a 30-day notice under 21 CFR 814.39(f); otherwise a PMA supplement may still be required.");
  }
  if (!_isPMA && ans.E5 === Answer.Yes && ans.C5 === Answer.No) {
    _consistencyIssues.push("A bias mitigation strategy was changed or removed, but the risk-control significance question was marked NO. If the mitigation functions as a safety or performance control, reassess C5.");
  }
  if (_isPMA && ans.E5 === Answer.Yes && ans.C_PMA1 === Answer.No) {
    _consistencyIssues.push("A bias mitigation strategy was changed or removed, but the PMA safety/effectiveness question was marked NO. If the mitigation affects safety, effectiveness, or clinically relevant performance across populations, reassess C_PMA1.");
  }
  const _isSignificant = _baseSignificant || _seNotSupportable;

  const _pmaQuestionsAnswered = _isPMA && !_isIntendedUseChange && !_isIntendedUseUncertain &&
    [Answer.Yes, Answer.No, Answer.Uncertain].includes(ans.C_PMA1);
  const _pmaIncomplete = _isPMA && !_isIntendedUseChange && !_isIntendedUseUncertain && !_pmaQuestionsAnswered;
  const _pmaRequiresSupplement = _isPMA && (
    _isIntendedUseChange || ans.C_PMA1 === Answer.Yes || ans.C_PMA1 === Answer.Uncertain
  );

  const _p3Applicable = _hasPCCP && ans.P1 === Answer.Yes && ans.P2 === Answer.Yes;
  const _p4Applicable = _p3Applicable && ans.P3 === Answer.Yes;
  const _p5Applicable = _p4Applicable && ans.P4 === Answer.Yes;
  // Gate on _hasPCCP to prevent stale P-block answers from triggering false verification
  const _pccpScopeVerified = _hasPCCP && ans.P1 === Answer.Yes && ans.P2 === Answer.Yes && ans.P3 === Answer.Yes && ans.P4 === Answer.Yes &&
    (!_p5Applicable || ans.P5 === Answer.Yes);
  const _pccpScopeFailed = _hasPCCP && !_isIntendedUseChange && !_isIntendedUseUncertain &&
    (
      ans.P1 === Answer.No ||
      (ans.P1 === Answer.Yes && ans.P2 === Answer.No) ||
      (_p3Applicable && ans.P3 === Answer.No) ||
      (_p4Applicable && ans.P4 === Answer.No) ||
      (_p5Applicable && ans.P5 === Answer.No)
    );
  // PCCP verification is only relevant when the change would otherwise require a submission.
  // For PMA: only when _pmaRequiresSupplement is true (otherwise it's PMAAnnualReport — no PCCP needed).
  // For non-PMA: only when _isSignificant is true (otherwise it's Letter to File — no PCCP needed).
  const _pccpIncomplete = _hasPCCP && !_isIntendedUseChange && !_isIntendedUseUncertain &&
    !_pccpScopeVerified && !_pccpScopeFailed &&
    ((!_isPMA && _isSignificant) || (_isPMA && !_pmaIncomplete && _pmaRequiresSupplement));

  let pathway;
  if (_isPMA) {
    if (_isIntendedUseChange) pathway = _baselineIncomplete ? Pathway.AssessmentIncomplete : Pathway.PMASupplementRequired;
    else if (_isIntendedUseUncertain) pathway = Pathway.AssessmentIncomplete;
    else if (_baselineIncomplete) pathway = Pathway.AssessmentIncomplete;
    else if (_pmaIncomplete) pathway = Pathway.AssessmentIncomplete;
    else if (_hasPCCP && _pccpScopeVerified && _pmaRequiresSupplement) pathway = Pathway.ImplementPCCP;
    else if (_hasPCCP && _pccpIncomplete && _pmaRequiresSupplement) pathway = Pathway.AssessmentIncomplete;
    else if (_pmaRequiresSupplement) pathway = Pathway.PMASupplementRequired;
    else pathway = Pathway.PMAAnnualReport;
  } else {
    if (_isIntendedUseChange) pathway = _baselineIncomplete ? Pathway.AssessmentIncomplete : Pathway.NewSubmission;
    else if (_isIntendedUseUncertain) pathway = Pathway.AssessmentIncomplete;
    else if (_baselineIncomplete) pathway = Pathway.AssessmentIncomplete;
    else if (_deNovoDeviceTypeFitFailed) pathway = Pathway.NewSubmission;
    else if (_isCyberOnly) pathway = Pathway.LetterToFile;
    else if (_isBugFix) pathway = Pathway.LetterToFile;
    else if (_significanceIncomplete) pathway = Pathway.AssessmentIncomplete;
    else if (_isSignificant) {
      if (_hasPCCP && !_isIntendedUseChange && !_isIntendedUseUncertain && _pccpScopeVerified) pathway = Pathway.ImplementPCCP;
      else if (_hasPCCP && !_isIntendedUseChange && !_isIntendedUseUncertain && _pccpIncomplete) pathway = Pathway.AssessmentIncomplete;
      else pathway = Pathway.NewSubmission;
    } else if (_allSignificanceNo) pathway = Pathway.LetterToFile;
    else pathway = Pathway.AssessmentIncomplete;
  }

  const isLetterToFile = pathway === Pathway.LetterToFile;
  const isPMAAnnualReport = pathway === Pathway.PMAAnnualReport;
  const isDocOnly = isLetterToFile || isPMAAnnualReport;
  const isPCCPImpl = pathway === Pathway.ImplementPCCP;
  const isNewSub = pathway === Pathway.NewSubmission || pathway === Pathway.PMASupplementRequired;
  const isIncomplete = pathway === Pathway.AssessmentIncomplete;

  const _pccpRecommendation = (() => {
    if (_hasPCCP || isDocOnly || isPCCPImpl || isIncomplete) return null;
    if (!isNewSub && !_pmaRequiresSupplement) return null;
    return { shouldRecommend: true };
  })();

  return {
    pathway, isDocOnly, isLetterToFile, isPMAAnnualReport, isPCCPImpl, isNewSub, isIncomplete,
    isIntendedUseChange: _isIntendedUseChange, isIntendedUseUncertain: _isIntendedUseUncertain,
    isCyberOnly: _isCyberOnly, isBugFix: _isBugFix,
    isSignificant: _isSignificant, baseSignificant: _baseSignificant, allSignificanceNo: _allSignificanceNo,
    significanceIncomplete: _significanceIncomplete,
    hasUncertainSignificance: _hasUncertainSignificance,
    cumulativeEscalation: _cumulativeEscalation,
    seNotSupportable: _seNotSupportable,
    seUncertain: _seUncertain,
    genAIHighImpactChange: _genAIHighImpactChange,
    consistencyIssues: _consistencyIssues,
    deNovoDeviceTypeFitFailed: _deNovoDeviceTypeFitFailed,
    baselineIncomplete: _baselineIncomplete,
    pmaRequiresSupplement: _pmaRequiresSupplement, pmaIncomplete: _pmaIncomplete,
    cumulativeDriftUnresolved: _cumulativeDriftUnresolved,
    pccpScopeVerified: _pccpScopeVerified, pccpScopeFailed: _pccpScopeFailed, pccpIncomplete: _pccpIncomplete,
    pccpRecommendation: _pccpRecommendation,
  };
};
