import { describe, expect, it } from 'vitest';
import {
  Answer,
  AuthPathway,
  Pathway,
  computeDetermination,
  computeDerivedState,
  getBlocks,
  getBlockFields,
  type Answers,
} from '../src/lib/assessment-engine';
import { buildPdfReportDocument, type PdfReportDocument } from '../src/lib/pdf-report-model';
import { buildDocxDocument } from '../src/lib/docx-renderer';
import { base510k, baseDeNovo, basePMA } from './helpers';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function buildDoc(answers: Answers, options?: { assessmentId?: string; assessmentName?: string }): PdfReportDocument {
  const determination = computeDetermination(answers);
  const ds = computeDerivedState(answers);
  const blocks = getBlocks(answers, ds);
  const getFieldsForBlock = (blockId: string) => getBlockFields(blockId, answers, ds);
  return buildPdfReportDocument(answers, determination, blocks, getFieldsForBlock, {
    assessmentId: options?.assessmentId,
    assessmentName: options?.assessmentName,
    reviewerNotes: [],
  });
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/* ------------------------------------------------------------------ */
/*  Document model tests                                               */
/* ------------------------------------------------------------------ */

describe('buildPdfReportDocument', () => {
  it('produces a complete document for a standard 510(k) Letter to File case', () => {
    const doc = buildDoc(base510k());

    expect(doc.header.title).toBe('Preliminary Regulatory Change Assessment Record');
    expect(doc.header.subtitle).toBe('ChangePath');
    expect(doc.header.generatedAt).toBeTruthy();
    expect(doc.header.assessmentStatus).toBeTruthy();
    expect(doc.header.exportVersion).toBe('pdf-v2');
    expect(doc.header.preparedFrom).toBe('Assessment record in ChangePath');

    expect(doc.executiveSummary.pathwayLabel).toBe(Pathway.LetterToFile);
    expect(doc.executiveSummary.isIncomplete).toBe(false);
    expect(doc.executiveSummary.recordStatus).toBe('Complete — pending qualified review');
    expect(doc.executiveSummary.relianceQualification).toContain('qualified regulatory');
    expect(doc.executiveSummary.primaryNextAction).toBeTruthy();
    expect(doc.executiveSummary.summaryStatement).toBeTruthy();
    expect(doc.executiveSummary.pathwayConclusion).toContain(
      `supports a preliminary pathway assessment of ${Pathway.LetterToFile}`,
    );
    expect('confidenceLevel' in doc.executiveSummary).toBe(false);

    expect(doc.assessmentBasis.recordFacts.length).toBeGreaterThan(0);
    expect(doc.assessmentBasis.systemGeneratedBasis.length).toBeGreaterThan(0);

    expect(doc.decisionTrace.steps.length).toBeGreaterThan(0);

    expect(doc.closing.disclaimer).toContain('not a regulatory determination');
    expect(doc.closing.generatedBy).toBe('ChangePath');
  });

  it('marks incomplete assessments correctly', () => {
    const sparseAnswers: Answers = { A1: AuthPathway.FiveOneZeroK };
    const doc = buildDoc(sparseAnswers);

    expect(doc.executiveSummary.isIncomplete).toBe(true);
    expect(doc.executiveSummary.pathwayLabel).toBe('Assessment Incomplete');
    expect(doc.executiveSummary.recordStatus).toContain('Incomplete');
    expect(doc.executiveSummary.pathwayConclusion).toContain('No pathway conclusion should be treated as supported');
    expect('confidenceLevel' in doc.executiveSummary).toBe(false);
  });

  it('handles PMA pathway', () => {
    const doc = buildDoc(basePMA());

    expect(
      doc.assessmentBasis.recordFacts.some((f) => f.label === 'Authorization Pathway' && f.value === AuthPathway.PMA),
    ).toBe(true);
    expect(doc.assessmentBasis.systemGeneratedBasis.some((s) => s.includes('PMA'))).toBe(true);
  });

  it('handles De Novo pathway', () => {
    const doc = buildDoc(baseDeNovo());

    expect(
      doc.assessmentBasis.recordFacts.some(
        (f) => f.label === 'Authorization Pathway' && f.value === AuthPathway.DeNovo,
      ),
    ).toBe(true);
  });

  it('handles sparse data gracefully (empty answers)', () => {
    const doc = buildDoc({});

    expect(doc.header.title).toBe('Preliminary Regulatory Change Assessment Record');
    expect(doc.executiveSummary.isIncomplete).toBe(true);
    expect(doc.assessmentBasis.recordFacts.length).toBeGreaterThan(0);
    const missingFacts = doc.assessmentBasis.recordFacts.filter((f) => f.isMissing);
    expect(missingFacts.length).toBeGreaterThan(0);
    expect(doc.closing.disclaimer).toBeTruthy();
  });

  it('includes assessment ID and name when provided', () => {
    const doc = buildDoc(base510k(), {
      assessmentId: 'TEST-123',
      assessmentName: 'My Test Assessment',
    });

    expect(doc.header.assessmentId).toBe('TEST-123');
    expect(doc.header.assessmentName).toBe('My Test Assessment');
  });

  it('omits assessment ID and name when not provided', () => {
    const doc = buildDoc(base510k());

    expect(doc.header.assessmentId).toBeNull();
    expect(doc.header.assessmentName).toBeNull();
  });

  it('includes reviewer notes when provided', () => {
    const answers = base510k();
    const determination = computeDetermination(answers);
    const ds = computeDerivedState(answers);
    const blocks = getBlocks(answers, ds);
    const getFieldsForBlock = (blockId: string) => getBlockFields(blockId, answers, ds);
    const doc = buildPdfReportDocument(answers, determination, blocks, getFieldsForBlock, {
      reviewerNotes: [
        { id: 'n1', author: 'Jane Smith', text: 'Reviewed baseline docs.', timestamp: '2025-01-15T10:00:00Z' },
        { id: 'n2', author: 'John Doe', text: 'PCCP not applicable.', timestamp: '2025-01-16T14:00:00Z' },
      ],
    });

    expect(doc.reviewerNotes).toHaveLength(2);
    expect(doc.reviewerNotes[0].author).toBe('Jane Smith');
    expect(doc.reviewerNotes[0].text).toBe('Reviewed baseline docs.');
    expect(doc.reviewerNotes[1].author).toBe('John Doe');
  });

  it('returns empty reviewer notes when none provided', () => {
    const doc = buildDoc(base510k());
    expect(doc.reviewerNotes).toHaveLength(0);
  });

  it('includes sources cited from determination', () => {
    const doc = buildDoc(base510k());
    expect(doc.sourcesCited.length).toBeGreaterThanOrEqual(0);
    doc.sourcesCited.forEach((s) => {
      expect(s.text).toBeTruthy();
      expect(s.badge).toBeTruthy();
      expect(s.shortText).toBeTruthy();
    });
  });

  it('includes PCCP-related content when PCCP is available', () => {
    const doc = buildDoc(base510k({ A2: Answer.Yes, A3: Answer.Yes, A4: Answer.Yes, A5: Answer.Yes }));

    const pccpFact = doc.assessmentBasis.recordFacts.find((f) => f.label === 'PCCP Status');
    expect(pccpFact).toBeTruthy();
    expect(pccpFact!.value).toContain('PCCP');
    expect(pccpFact!.isMissing).toBe(false);
  });

  it('handles no-sources case without error', () => {
    const doc = buildDoc({});
    expect(Array.isArray(doc.sourcesCited)).toBe(true);
  });

  it('omits alternative pathways for incomplete assessments', () => {
    const doc = buildDoc({});
    expect(doc.alternativePathways).toHaveLength(0);
  });

  it('includes open issues when consistency problems exist', () => {
    const doc = buildDoc(base510k({ D1: Answer.Yes }));
    expect(Array.isArray(doc.openIssues)).toBe(true);
  });

  it('softens the pathway conclusion when open issues remain', () => {
    const doc = buildDoc(base510k({ E1: Answer.No }));

    expect(doc.executiveSummary.isIncomplete).toBe(false);
    expect(doc.openIssues.length).toBeGreaterThan(0);
    expect(doc.executiveSummary.recordStatus).toBe('Preliminary — open issues remain');
    expect(doc.executiveSummary.pathwayConclusion).toContain('preliminary pathway assessment');
    expect(doc.executiveSummary.relianceQualification).toContain('Limited reliance only');
  });

  it('deduplicates rationale text across the PDF narrative view', () => {
    const doc = buildDoc(
      base510k({
        B1: 'Software change',
        B2: 'Algorithm enhancement',
        B4: 'Updated the model ranking logic while keeping the clinician-facing output structure unchanged.',
      }),
    );
    const normalizedHeadline = normalizeText(doc.narrative.headlineReason);
    const normalizedSupportingPoints = doc.narrative.supportingPoints.map(normalizeText);

    expect(normalizedSupportingPoints).not.toContain(normalizedHeadline);
    expect(new Set(normalizedSupportingPoints).size).toBe(normalizedSupportingPoints.length);
  });

  it('formats each source reference individually without grouping', () => {
    const doc = buildDoc(base510k());
    const softwareGuidanceEntries = doc.sourcesCited.filter((source) => source.text === 'FDA-SW-510K-2017');

    // Each source ref should appear as its own entry (matching ReviewPanel count)
    expect(softwareGuidanceEntries.length).toBeGreaterThanOrEqual(1);
    // No "sections referenced" grouping — each entry has its own section inline
    softwareGuidanceEntries.forEach((entry) => {
      expect(entry.badge).not.toContain('sections referenced:');
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Grammar / pluralization                                          */
  /* ---------------------------------------------------------------- */

  it('uses correct singular grammar: "1 open issue remains"', () => {
    const doc = buildDoc(base510k({ E1: Answer.No }));
    if (doc.openIssues.length === 1) {
      expect(doc.executiveSummary.relianceQualification).toContain('1 open issue remains');
      expect(doc.executiveSummary.relianceQualification).not.toContain('1 open issue remain and');
    }
  });

  it('uses correct plural grammar: "N open issues remain"', () => {
    const doc = buildDoc(base510k({ D1: Answer.Yes, E1: Answer.No }));
    if (doc.openIssues.length > 1) {
      expect(doc.executiveSummary.relianceQualification).toMatch(/\d+ open issues remain and/);
    }
  });

  it('passes isLongText flag through to record facts', () => {
    const doc = buildDoc(base510k({ B4: 'A detailed change description.' }));
    const changeDesc = doc.assessmentBasis.recordFacts.find((f) => f.label === 'Submitted Change Description');
    expect(changeDesc).toBeTruthy();
    expect(changeDesc!.isLongText).toBe(true);

    const authPathway = doc.assessmentBasis.recordFacts.find((f) => f.label === 'Authorization Pathway');
    expect(authPathway).toBeTruthy();
    expect(authPathway!.isLongText).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  Regulatory framing and disclaimer tests                            */
/* ------------------------------------------------------------------ */

describe('regulatory framing and disclaimers', () => {
  it('includes conservative-policy transparency in the disclaimer', () => {
    const doc = buildDoc(base510k());
    expect(doc.closing.disclaimer).toContain('conservative internal policies');
    expect(doc.closing.disclaimer).toContain('not direct regulatory mandates');
  });

  it('uses "preliminary" language in report title', () => {
    const doc = buildDoc(base510k());
    expect(doc.header.title).toContain('Preliminary');
  });

  it('uses "preliminary" in conclusion statement for clean records', () => {
    const doc = buildDoc(base510k());
    expect(doc.executiveSummary.pathwayConclusion).toContain('preliminary');
  });

  it('uses "provisionally supports" when open issues remain', () => {
    const answers = base510k({ E1: Answer.No });
    const doc = buildDoc(answers);
    // open issues from E1=No should trigger "provisionally"
    if (doc.openIssues.length > 0) {
      expect(doc.executiveSummary.pathwayConclusion).toMatch(/provisionally|preliminary/);
    }
  });

  it('reliance qualification mentions "No tool-detected issues" for clean records', () => {
    const doc = buildDoc(base510k());
    if (doc.openIssues.length === 0 && !doc.executiveSummary.isIncomplete) {
      expect(doc.executiveSummary.relianceQualification).toContain('No tool-detected issues');
    }
  });

  it('reliance qualification says "Not suitable for reliance" when incomplete', () => {
    const doc = buildDoc({});
    expect(doc.executiveSummary.relianceQualification).toContain('Not suitable for reliance');
  });
});

/* ------------------------------------------------------------------ */
/*  Word document renderer tests                                       */
/* ------------------------------------------------------------------ */

describe('buildDocxDocument', () => {
  it('builds a Document from a standard 510(k) case', () => {
    const reportDoc = buildDoc(base510k());
    const doc = buildDocxDocument(reportDoc);
    expect(doc).toBeTruthy();
  });

  it('builds a Document from sparse data without throwing', () => {
    const reportDoc = buildDoc({});
    const doc = buildDocxDocument(reportDoc);
    expect(doc).toBeTruthy();
  });

  it('builds a Document from a PMA case', () => {
    const reportDoc = buildDoc(basePMA());
    const doc = buildDocxDocument(reportDoc);
    expect(doc).toBeTruthy();
  });

  it('builds a Document from a De Novo case', () => {
    const reportDoc = buildDoc(baseDeNovo());
    const doc = buildDocxDocument(reportDoc);
    expect(doc).toBeTruthy();
  });

  it('builds a Document with reviewer notes', () => {
    const answers = base510k();
    const determination = computeDetermination(answers);
    const ds = computeDerivedState(answers);
    const blocks = getBlocks(answers, ds);
    const getFieldsForBlock = (blockId: string) => getBlockFields(blockId, answers, ds);
    const reportDoc = buildPdfReportDocument(answers, determination, blocks, getFieldsForBlock, {
      reviewerNotes: [{ id: 'n1', author: 'Tester', text: 'Looks good.', timestamp: '2025-01-15T10:00:00Z' }],
    });
    const doc = buildDocxDocument(reportDoc);
    expect(doc).toBeTruthy();
  });

  it('builds a Document with open issues (PCCP case)', () => {
    const answers = base510k({
      A2: Answer.Yes,
      A3: Answer.Yes,
      A4: Answer.Yes,
      A5: Answer.Yes,
      B1: 'Software change',
      B2: 'Algorithm enhancement',
      B4: 'Raise the alert threshold within the prospectively authorized operating range.',
      E1: Answer.No,
    });
    const reportDoc = buildDoc(answers);
    expect(reportDoc.openIssues.length).toBeGreaterThan(0);
    const doc = buildDocxDocument(reportDoc);
    expect(doc).toBeTruthy();
  });

  it('handles long text fields without truncation', () => {
    const longText = 'Updated the neural network architecture to incorporate multi-head attention. '.repeat(20);
    const answers = base510k({ B4: longText });
    const reportDoc = buildDoc(answers);
    expect(
      reportDoc.assessmentBasis.recordFacts.find((f) => f.label === 'Submitted Change Description')!.value.length,
    ).toBeGreaterThan(500);

    const doc = buildDocxDocument(reportDoc);
    expect(doc).toBeTruthy();
  });

  it('builds a Document with assessment ID and name', () => {
    const reportDoc = buildDoc(base510k(), {
      assessmentId: 'TEST-456',
      assessmentName: 'Sepsis Alert Threshold Change',
    });
    const doc = buildDocxDocument(reportDoc);
    expect(doc).toBeTruthy();
  });
});
