/**
 * Word document renderer for regulatory assessment records.
 *
 * Converts a PdfReportDocument model into a professional .docx file
 * suitable for enterprise medical-device compliance documentation.
 */

import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  LevelFormat,
  TabStopPosition,
  TabStopType,
  TableLayoutType,
  Packer,
} from 'docx';
import type {
  PdfReportDocument,
  PdfOpenIssue,
  PdfSourceCitation,
} from './pdf-report-model';

/* ------------------------------------------------------------------ */
/*  Layout constants (DXA: 1440 = 1 inch)                              */
/* ------------------------------------------------------------------ */

const PAGE_WIDTH = 12240;   // 8.5" US Letter
const PAGE_HEIGHT = 15840;  // 11"
const MARGIN = 1440;        // 1" margins
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 9360 DXA

const FONT = 'Calibri';

/* Column width presets (DXA, must sum to CONTENT_WIDTH) */
const COL = {
  titleLabel: 1870,   // ~20%
  titleValue: CONTENT_WIDTH - 1870,
  mainLabel: 2620,    // ~28%
  mainValue: CONTENT_WIDTH - 2620,
  factLabel: 3000,    // ~32%
  factValue: CONTENT_WIDTH - 3000,
  issueLabel: 2060,   // ~22%
  issueValue: CONTENT_WIDTH - 2060,
  closingLabel: 2060,
  closingValue: CONTENT_WIDTH - 2060,
};

/* ------------------------------------------------------------------ */
/*  Style constants                                                    */
/* ------------------------------------------------------------------ */

const C = {
  text: '212529',
  secondary: '6C757D',
  muted: '939BA4',
  accent: '343A40',
  border: 'C8CCD2',
  lightBg: 'F6F8FA',
  tagBg: 'E8ECF0',
  white: 'FFFFFF',
  missing: 'AFAFAF',
};

const CELL_PAD = { top: 40, bottom: 40, left: 100, right: 100 };
const CELL_PAD_LABEL = { top: 40, bottom: 40, left: 0, right: 100 };

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: C.white };
const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };
const NO_TABLE_BORDERS = {
  ...NO_BORDERS,
  insideHorizontal: NO_BORDER,
  insideVertical: NO_BORDER,
};

/* ------------------------------------------------------------------ */
/*  Numbering config                                                   */
/* ------------------------------------------------------------------ */

const NUMBERING_CONFIGS = [
  {
    reference: 'main-numbered',
    levels: [{
      level: 0,
      format: LevelFormat.DECIMAL,
      text: '%1.',
      alignment: AlignmentType.START,
      style: {
        run: { font: FONT, size: 18, bold: true, color: C.secondary },
        paragraph: { indent: { left: 500, hanging: 360 } },
      },
    }],
  },
  {
    reference: 'source-numbered',
    levels: [{
      level: 0,
      format: LevelFormat.DECIMAL,
      text: '%1.',
      alignment: AlignmentType.START,
      style: {
        run: { font: FONT, size: 17, bold: true, color: C.secondary },
        paragraph: { indent: { left: 500, hanging: 360 } },
      },
    }],
  },
];

/* ------------------------------------------------------------------ */
/*  Helper builders                                                    */
/* ------------------------------------------------------------------ */

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    });
  } catch { return iso; }
}

function formatDateShort(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return iso; }
}

/** Section heading with top border rule. */
function heading(title: string): Paragraph {
  return new Paragraph({
    spacing: { before: 300, after: 100 },
    border: { top: { style: BorderStyle.SINGLE, size: 6, color: C.border, space: 8 } },
    children: [new TextRun({ text: title, font: FONT, size: 24, bold: true, color: C.accent })],
  });
}

/** Subheading. */
function subheading(title: string): Paragraph {
  return new Paragraph({
    spacing: { before: 180, after: 60 },
    children: [new TextRun({ text: title, font: FONT, size: 20, bold: true, color: C.text })],
  });
}

/** Italic section note. */
function note(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 0, after: 80 },
    children: [new TextRun({ text, font: FONT, size: 16, italics: true, color: C.muted })],
  });
}

/** Body text paragraph. */
function body(text: string, opts?: { secondary?: boolean; indent?: number }): Paragraph {
  return new Paragraph({
    spacing: { before: 20, after: 80 },
    indent: opts?.indent ? { left: opts.indent } : undefined,
    children: [new TextRun({
      text, font: FONT, size: 19,
      color: opts?.secondary ? C.secondary : C.text,
    })],
  });
}

/** Two-column label-value table. DXA widths required. */
function kvTable(
  items: Array<{ label: string; value: string; isMissing?: boolean }>,
  labelW: number,
  valueW: number,
): Table {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [labelW, valueW],
    layout: TableLayoutType.FIXED,
    borders: NO_TABLE_BORDERS,
    rows: items.map((item) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: labelW, type: WidthType.DXA },
            borders: NO_BORDERS,
            margins: CELL_PAD_LABEL,
            children: [new Paragraph({
              spacing: { before: 0, after: 0 },
              children: [new TextRun({
                text: item.label, font: FONT, size: 17, bold: true, color: C.secondary,
              })],
            })],
          }),
          new TableCell({
            width: { size: valueW, type: WidthType.DXA },
            borders: NO_BORDERS,
            margins: CELL_PAD,
            children: [new Paragraph({
              spacing: { before: 0, after: 0 },
              children: [new TextRun({
                text: item.value, font: FONT, size: 19,
                color: item.isMissing ? C.missing : C.text,
              })],
            })],
          }),
        ],
      }),
    ),
  });
}

/** Stacked label (label on top, value below indented). For long-text fields. */
function stackedField(label: string, value: string, isMissing = false): Paragraph[] {
  return [
    new Paragraph({
      spacing: { before: 100, after: 20 },
      children: [new TextRun({ text: label, font: FONT, size: 17, bold: true, color: C.secondary })],
    }),
    new Paragraph({
      spacing: { before: 0, after: 80 },
      indent: { left: 280 },
      children: [new TextRun({
        text: value, font: FONT, size: 19,
        color: isMissing ? C.missing : C.text,
      })],
    }),
  ];
}

/** Numbered list items using proper Word numbering. */
function numberedItems(
  items: string[],
  ref: string,
  fontSize = 19,
): Paragraph[] {
  return items.map((item) =>
    new Paragraph({
      spacing: { before: 20, after: 40 },
      numbering: { reference: ref, level: 0 },
      children: [new TextRun({ text: item, font: FONT, size: fontSize, color: C.text })],
    }),
  );
}

/** Tag-style badge inline. */
function tag(label: string): TextRun {
  return new TextRun({
    text: ` ${label} `,
    font: FONT, size: 15, bold: true, color: C.secondary,
    shading: { type: ShadingType.CLEAR, fill: C.tagBg, color: C.tagBg },
  });
}

/* ------------------------------------------------------------------ */
/*  Section builders                                                   */
/* ------------------------------------------------------------------ */

function buildTitle(doc: PdfReportDocument): (Paragraph | Table)[] {
  const els: (Paragraph | Table)[] = [];

  els.push(new Paragraph({
    spacing: { before: 0, after: 60 },
    children: [new TextRun({
      text: 'INTERNAL ASSESSMENT SUPPORT RECORD',
      font: FONT, size: 15, bold: true, color: C.muted, characterSpacing: 60,
    })],
  }));

  els.push(new Paragraph({
    spacing: { before: 0, after: 80 },
    children: [new TextRun({
      text: doc.header.title,
      font: FONT, size: 32, bold: true, color: C.text,
    })],
  }));

  els.push(new Paragraph({
    spacing: { before: 0, after: 160 },
    children: [new TextRun({
      text: `Prepared from the current assessment record in ${doc.header.subtitle}.`,
      font: FONT, size: 19, color: C.secondary,
    })],
  }));

  const meta: Array<{ label: string; value: string }> = [];
  if (doc.header.assessmentName) meta.push({ label: 'Assessment', value: doc.header.assessmentName });
  if (doc.header.assessmentId) meta.push({ label: 'ID', value: doc.header.assessmentId });
  meta.push(
    { label: 'Pathway', value: doc.executiveSummary.pathwayLabel },
    { label: 'Status', value: doc.header.assessmentStatus },
    { label: 'Generated', value: formatTimestamp(doc.header.generatedAt) },
  );
  els.push(kvTable(meta, COL.titleLabel, COL.titleValue));

  return els;
}

function buildSummary(doc: PdfReportDocument): (Paragraph | Table)[] {
  const els: (Paragraph | Table)[] = [];
  const s = doc.executiveSummary;

  els.push(heading('Assessment Summary'));

  if (s.isIncomplete) {
    els.push(new Paragraph({
      spacing: { before: 40, after: 120 },
      shading: { type: ShadingType.CLEAR, fill: C.lightBg, color: C.lightBg },
      border: {
        top: { style: BorderStyle.SINGLE, size: 4, color: C.border },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: C.border },
        left: { style: BorderStyle.SINGLE, size: 4, color: C.border },
        right: { style: BorderStyle.SINGLE, size: 4, color: C.border },
      },
      children: [
        new TextRun({ text: 'Record status notice: ', font: FONT, size: 17, bold: true, color: C.text }),
        new TextRun({
          text: 'Pathway-critical items remain unresolved; do not treat the current record as a supported pathway conclusion.',
          font: FONT, size: 17, color: C.text,
        }),
      ],
    }));
  }

  els.push(kvTable([
    { label: 'Record Status', value: s.recordStatus },
    { label: 'Conditions for Reliance', value: s.relianceQualification },
    { label: 'Recommended Next Action', value: s.primaryNextAction },
  ], COL.mainLabel, COL.mainValue));

  els.push(subheading('Conclusion'));
  els.push(body(s.pathwayConclusion));

  if (s.summaryStatement && s.summaryStatement !== s.pathwayConclusion) {
    els.push(subheading('Analytical Summary'));
    els.push(note('System-generated summary derived from the assessment logic; review against the record facts and cited sources.'));
    els.push(body(s.summaryStatement));
  }

  return els;
}

function buildBasis(doc: PdfReportDocument): (Paragraph | Table)[] {
  const els: (Paragraph | Table)[] = [];
  const b = doc.assessmentBasis;

  els.push(heading('Assessment Basis'));
  els.push(subheading('Record Facts'));
  els.push(note('Copied from the assessment record as entered. Missing fields are shown as "Not provided."'));

  const shortFacts = b.recordFacts.filter((f) => !f.isLongText);
  const longFacts = b.recordFacts.filter((f) => f.isLongText);

  if (shortFacts.length > 0) {
    els.push(kvTable(
      shortFacts.map((f) => ({ label: f.label, value: f.value, isMissing: f.isMissing })),
      COL.factLabel, COL.factValue,
    ));
  }

  longFacts.forEach((f) => {
    els.push(...stackedField(f.label, f.value, f.isMissing));
  });

  if (b.systemGeneratedBasis.length > 0) {
    els.push(subheading('Derived Assessment Basis'));
    els.push(note('Derived by ChangePath from the recorded answers and decision logic. Analytical support, not source evidence.'));
    els.push(...numberedItems(b.systemGeneratedBasis, 'main-numbered'));
  }

  return els;
}

function buildTrace(doc: PdfReportDocument): (Paragraph | Table)[] {
  if (doc.decisionTrace.steps.length === 0) return [];
  return [
    heading('Decision Logic Trace'),
    note('Ordered logic steps applied to the current record to arrive at the present pathway assessment.'),
    ...numberedItems(doc.decisionTrace.steps, 'main-numbered'),
  ];
}

function buildNarrative(doc: PdfReportDocument): (Paragraph | Table)[] {
  const n = doc.narrative;
  if (!n.headlineReason && n.supportingPoints.length === 0 && n.verificationSteps.length === 0) return [];

  const els: (Paragraph | Table)[] = [];
  els.push(heading('Assessment Rationale'));
  els.push(note('System-generated explanatory text. Review against the record facts and cited sources before reliance.'));

  if (n.headlineReason && n.headlineReason !== doc.executiveSummary.summaryStatement) {
    els.push(body(n.headlineReason));
  }
  n.supportingPoints.forEach((p) => els.push(body(p, { secondary: true, indent: 280 })));

  if (n.verificationSteps.length > 0) {
    els.push(subheading(n.verificationTitle || 'Verification Focus'));
    els.push(...numberedItems(n.verificationSteps, 'main-numbered'));
  }

  return els;
}

function buildIssueBlock(issue: PdfOpenIssue, index: number): (Paragraph | Table)[] {
  const els: (Paragraph | Table)[] = [];
  const kindLabel = issue.kind === 'expert-review' ? 'Expert Review' : 'Evidence Gap';

  // Tag line + separator for non-first items
  els.push(new Paragraph({
    spacing: { before: index === 0 ? 0 : 180, after: 40 },
    border: index > 0
      ? { top: { style: BorderStyle.SINGLE, size: 2, color: C.border, space: 8 } }
      : undefined,
    children: [
      tag(`Issue ${index + 1}`),
      new TextRun({ text: '  ', font: FONT, size: 15 }),
      tag(kindLabel),
    ],
  }));

  // Title
  els.push(new Paragraph({
    spacing: { before: 0, after: 60 },
    indent: { left: 200 },
    children: [new TextRun({ text: issue.title, font: FONT, size: 19, bold: true, color: C.text })],
  }));

  // Details table
  const details: Array<{ label: string; value: string }> = [];
  if (issue.meta) details.push({ label: 'Context', value: issue.meta });
  details.push({ label: 'Record Impact', value: issue.whyItMatters });
  details.push({ label: 'Required Action', value: `${issue.actionLabel}: ${issue.actionNeeded}` });
  if (issue.sources.length > 0) details.push({ label: 'Basis Referenced', value: issue.sources.join('; ') });

  els.push(new Table({
    width: { size: CONTENT_WIDTH - 200, type: WidthType.DXA },
    columnWidths: [COL.issueLabel, CONTENT_WIDTH - 200 - COL.issueLabel],
    layout: TableLayoutType.FIXED,
    indent: { size: 200, type: WidthType.DXA },
    borders: NO_TABLE_BORDERS,
    rows: details.map((d) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: COL.issueLabel, type: WidthType.DXA },
            borders: NO_BORDERS,
            margins: { top: 20, bottom: 20, left: 0, right: 80 },
            children: [new Paragraph({
              spacing: { before: 0, after: 0 },
              children: [new TextRun({ text: d.label, font: FONT, size: 15, bold: true, color: C.secondary })],
            })],
          }),
          new TableCell({
            width: { size: CONTENT_WIDTH - 200 - COL.issueLabel, type: WidthType.DXA },
            borders: NO_BORDERS,
            margins: { top: 20, bottom: 20, left: 80, right: 0 },
            children: [new Paragraph({
              spacing: { before: 0, after: 0 },
              children: [new TextRun({ text: d.value, font: FONT, size: 17, color: C.text })],
            })],
          }),
        ],
      }),
    ),
  }));

  return els;
}

function buildIssues(doc: PdfReportDocument): (Paragraph | Table)[] {
  if (doc.openIssues.length === 0) return [];
  const n = doc.openIssues.length;
  return [
    heading('Open Issues Requiring Resolution'),
    note(`${n} open item${n === 1 ? '' : 's'} that limit${n === 1 ? 's' : ''} reliance on the current pathway assessment until resolved or supplemented.`),
    ...doc.openIssues.flatMap((issue, i) => buildIssueBlock(issue, i)),
  ];
}

function buildAltPathways(doc: PdfReportDocument): (Paragraph | Table)[] {
  if (doc.alternativePathways.length === 0) return [];
  return [
    heading('Conditions That Could Affect the Pathway'),
    note('Conditions identified by the assessment logic that could change, qualify, or overturn the current pathway assessment.'),
    ...numberedItems(doc.alternativePathways.map((ap) => ap.description), 'main-numbered'),
  ];
}

function buildSources(doc: PdfReportDocument): (Paragraph | Table)[] {
  if (doc.sourcesCited.length === 0) return [];
  return [
    heading('Sources Cited'),
    note('Regulatory and standards references surfaced by the assessment logic. Citations indicate relevance, not statement-level attribution.'),
    ...doc.sourcesCited.map((source: PdfSourceCitation) =>
      new Paragraph({
        spacing: { before: 20, after: 30 },
        numbering: { reference: 'source-numbered', level: 0 },
        children: [new TextRun({ text: source.badge, font: FONT, size: 17, color: C.text })],
      }),
    ),
  ];
}

function buildReviewerNotes(doc: PdfReportDocument): (Paragraph | Table)[] {
  if (doc.reviewerNotes.length === 0) return [];
  const els: (Paragraph | Table)[] = [];
  els.push(heading('Reviewer Notes'));
  els.push(note('User-entered annotations attached to this assessment. Not system-generated content.'));

  doc.reviewerNotes.forEach((n) => {
    els.push(new Paragraph({
      spacing: { before: 100, after: 20 },
      indent: { left: 200 },
      children: [
        new TextRun({ text: n.author, font: FONT, size: 15, bold: true, color: C.secondary }),
        new TextRun({ text: ` \u2014 ${formatDateShort(n.timestamp)}`, font: FONT, size: 15, color: C.muted }),
      ],
    }));
    els.push(new Paragraph({
      spacing: { before: 0, after: 80 },
      indent: { left: 200 },
      children: [new TextRun({ text: n.text, font: FONT, size: 19, color: C.text })],
    }));
  });

  return els;
}

function buildClosing(doc: PdfReportDocument): (Paragraph | Table)[] {
  return [
    heading('Document Control'),
    kvTable([
      { label: 'Source', value: `Assessment record in ${doc.closing.generatedBy}` },
      { label: 'Generated', value: formatTimestamp(doc.closing.timestamp) },
      { label: 'Logic Version', value: doc.closing.schemaVersion },
      { label: 'Export Format', value: doc.closing.exportVersion },
    ], COL.closingLabel, COL.closingValue),
    new Paragraph({
      spacing: { before: 200, after: 0 },
      shading: { type: ShadingType.CLEAR, fill: C.lightBg, color: C.lightBg },
      border: {
        top: { style: BorderStyle.SINGLE, size: 2, color: C.border },
        bottom: { style: BorderStyle.SINGLE, size: 2, color: C.border },
        left: { style: BorderStyle.SINGLE, size: 2, color: C.border },
        right: { style: BorderStyle.SINGLE, size: 2, color: C.border },
      },
      children: [new TextRun({
        text: doc.closing.disclaimer,
        font: FONT, size: 17, italics: true, color: C.secondary,
      })],
    }),
  ];
}

/* ------------------------------------------------------------------ */
/*  Document assembly                                                  */
/* ------------------------------------------------------------------ */

export function buildDocxDocument(reportDoc: PdfReportDocument): Document {
  const headerText = reportDoc.header.assessmentId
    ? `${reportDoc.header.title}  |  ID: ${reportDoc.header.assessmentId}`
    : reportDoc.header.title;

  return new Document({
    numbering: { config: NUMBERING_CONFIGS },
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 19, color: C.text },
          paragraph: { spacing: { line: 276 } },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
          margin: { top: MARGIN, bottom: 1080, left: MARGIN, right: MARGIN },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.border, space: 4 } },
            tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
            children: [
              new TextRun({ text: headerText, font: FONT, size: 14, color: C.muted }),
              new TextRun({ text: '\t', font: FONT, size: 14 }),
              new TextRun({ text: formatDateShort(reportDoc.header.generatedAt), font: FONT, size: 14, color: C.muted }),
            ],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.border, space: 4 } },
            tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
            children: [
              new TextRun({ text: 'Internal assessment support record \u2014 not a regulatory determination', font: FONT, size: 13, color: C.muted }),
              new TextRun({ text: '\t', font: FONT, size: 13 }),
              new TextRun({ text: 'Page ', font: FONT, size: 13, color: C.muted }),
              new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 13, color: C.muted }),
              new TextRun({ text: ' of ', font: FONT, size: 13, color: C.muted }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 13, color: C.muted }),
            ],
          })],
        }),
      },
      children: [
        ...buildTitle(reportDoc),
        ...buildSummary(reportDoc),
        ...buildBasis(reportDoc),
        ...buildTrace(reportDoc),
        ...buildNarrative(reportDoc),
        ...buildIssues(reportDoc),
        ...buildAltPathways(reportDoc),
        ...buildSources(reportDoc),
        ...buildReviewerNotes(reportDoc),
        ...buildClosing(reportDoc),
      ],
    }],
  });
}

/* ------------------------------------------------------------------ */
/*  Public download function                                           */
/* ------------------------------------------------------------------ */

export async function generateAndDownloadDocx(reportDoc: PdfReportDocument): Promise<void> {
  const doc = buildDocxDocument(reportDoc);
  const blob = await Packer.toBlob(doc);

  const datePart = new Date().toISOString().slice(0, 10);
  const idPart = reportDoc.header.assessmentId
    ? `-${reportDoc.header.assessmentId}`
    : '';
  const namePart = reportDoc.header.assessmentName
    ? `-${reportDoc.header.assessmentName.replace(/[^a-zA-Z0-9]+/g, '-').replace(/-+$/, '').slice(0, 40)}`
    : '';
  const filename = `ChangePath-Assessment${idPart}${namePart}-${datePart}.docx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
