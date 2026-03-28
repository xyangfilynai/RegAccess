/**
 * Word document renderer for regulatory assessment records.
 *
 * Converts a PdfReportDocument model into a professional .docx file
 * suitable for enterprise medical-device compliance documentation.
 * Uses the docx library which handles pagination, typography, and
 * layout natively — producing cleaner output than manual PDF layout.
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
  HeadingLevel,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  TabStopPosition,
  TabStopType,
  TableLayoutType,
  convertInchesToTwip,
  Packer,
} from 'docx';
import type {
  PdfReportDocument,
  PdfOpenIssue,
  PdfSourceCitation,
  PdfAssessmentBasisFact,
} from './pdf-report-model';

/* ------------------------------------------------------------------ */
/*  Style constants                                                    */
/* ------------------------------------------------------------------ */

const COLORS = {
  text: '212529',
  textSecondary: '6C757D',
  textMuted: '939BA4',
  accent: '343A40',
  border: 'C8CCD2',
  lightBg: 'F6F8FA',
  tagBg: 'E8ECF0',
  white: 'FFFFFF',
  missingText: 'AFAFAF',
};

const FONT_FAMILY = 'Calibri';

const noBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: COLORS.white },
  bottom: { style: BorderStyle.NONE, size: 0, color: COLORS.white },
  left: { style: BorderStyle.NONE, size: 0, color: COLORS.white },
  right: { style: BorderStyle.NONE, size: 0, color: COLORS.white },
};

const bottomBorderOnly = {
  top: { style: BorderStyle.NONE, size: 0, color: COLORS.white },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
  left: { style: BorderStyle.NONE, size: 0, color: COLORS.white },
  right: { style: BorderStyle.NONE, size: 0, color: COLORS.white },
};

/* ------------------------------------------------------------------ */
/*  Helper builders                                                    */
/* ------------------------------------------------------------------ */

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    return iso;
  }
}

function formatDateShort(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

/** Creates a section-heading paragraph with a top border rule. */
function sectionHeading(title: string): Paragraph {
  return new Paragraph({
    spacing: { before: 280, after: 80 },
    border: {
      top: { style: BorderStyle.SINGLE, size: 6, color: COLORS.border, space: 6 },
    },
    children: [
      new TextRun({
        text: title,
        font: FONT_FAMILY,
        size: 24,
        bold: true,
        color: COLORS.accent,
      }),
    ],
  });
}

/** Creates a subheading paragraph. */
function subheading(title: string): Paragraph {
  return new Paragraph({
    spacing: { before: 160, after: 60 },
    children: [
      new TextRun({
        text: title,
        font: FONT_FAMILY,
        size: 21,
        bold: true,
        color: COLORS.text,
      }),
    ],
  });
}

/** Creates an italicized section note. */
function sectionNote(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 0, after: 80 },
    children: [
      new TextRun({
        text,
        font: FONT_FAMILY,
        size: 15,
        italics: true,
        color: COLORS.textMuted,
      }),
    ],
  });
}

/** Creates a body-text paragraph. */
function bodyText(text: string, options?: { secondary?: boolean; indent?: number }): Paragraph {
  return new Paragraph({
    spacing: { before: 20, after: 60 },
    indent: options?.indent ? { left: options.indent } : undefined,
    children: [
      new TextRun({
        text,
        font: FONT_FAMILY,
        size: 19,
        color: options?.secondary ? COLORS.textSecondary : COLORS.text,
      }),
    ],
  });
}

/** Creates a label-value table row (borderless, two-column aligned). */
function labelValueRow(
  label: string,
  value: string,
  isMissing = false,
  labelWidthPct = 28,
): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: labelWidthPct, type: WidthType.PERCENTAGE },
        borders: noBorders,
        margins: { top: 20, bottom: 20, right: 80 },
        children: [
          new Paragraph({
            spacing: { before: 0, after: 0 },
            children: [
              new TextRun({
                text: label,
                font: FONT_FAMILY,
                size: 17,
                bold: true,
                color: COLORS.textSecondary,
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 100 - labelWidthPct, type: WidthType.PERCENTAGE },
        borders: noBorders,
        margins: { top: 20, bottom: 20 },
        children: [
          new Paragraph({
            spacing: { before: 0, after: 0 },
            children: [
              new TextRun({
                text: value,
                font: FONT_FAMILY,
                size: 19,
                color: isMissing ? COLORS.missingText : COLORS.text,
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

/** Creates a borderless two-column table from label-value pairs. */
function labelValueTable(
  items: Array<{ label: string; value: string; isMissing?: boolean }>,
  labelWidthPct = 28,
): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: COLORS.white },
      bottom: { style: BorderStyle.NONE, size: 0, color: COLORS.white },
      left: { style: BorderStyle.NONE, size: 0, color: COLORS.white },
      right: { style: BorderStyle.NONE, size: 0, color: COLORS.white },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: COLORS.white },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: COLORS.white },
    },
    rows: items.map((item) =>
      labelValueRow(item.label, item.value, item.isMissing, labelWidthPct),
    ),
  });
}

/** Creates a numbered list. */
function numberedList(items: string[], fontSize = 19): Paragraph[] {
  return items.map((item, i) =>
    new Paragraph({
      spacing: { before: 20, after: 40 },
      indent: { left: convertInchesToTwip(0.35), hanging: convertInchesToTwip(0.25) },
      children: [
        new TextRun({
          text: `${i + 1}.  `,
          font: FONT_FAMILY,
          size: fontSize,
          bold: true,
          color: COLORS.textSecondary,
        }),
        new TextRun({
          text: item,
          font: FONT_FAMILY,
          size: fontSize,
          color: COLORS.text,
        }),
      ],
    }),
  );
}

/** Creates a tag-style inline badge. */
function tagRun(label: string): TextRun {
  return new TextRun({
    text: ` ${label} `,
    font: FONT_FAMILY,
    size: 15,
    bold: true,
    color: COLORS.textSecondary,
    shading: { type: ShadingType.CLEAR, fill: COLORS.tagBg, color: COLORS.tagBg },
  });
}

/* ------------------------------------------------------------------ */
/*  Section builders                                                   */
/* ------------------------------------------------------------------ */

function buildTitleSection(doc: PdfReportDocument): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  // Document kicker
  elements.push(
    new Paragraph({
      spacing: { before: 0, after: 40 },
      children: [
        new TextRun({
          text: 'INTERNAL ASSESSMENT SUPPORT RECORD',
          font: FONT_FAMILY,
          size: 15,
          bold: true,
          color: COLORS.textMuted,
          characterSpacing: 60,
        }),
      ],
    }),
  );

  // Main title
  elements.push(
    new Paragraph({
      spacing: { before: 0, after: 60 },
      children: [
        new TextRun({
          text: doc.header.title,
          font: FONT_FAMILY,
          size: 32,
          bold: true,
          color: COLORS.text,
        }),
      ],
    }),
  );

  // Provenance line
  elements.push(
    new Paragraph({
      spacing: { before: 0, after: 140 },
      children: [
        new TextRun({
          text: `Prepared from the current assessment record in ${doc.header.subtitle}.`,
          font: FONT_FAMILY,
          size: 19,
          color: COLORS.textSecondary,
        }),
      ],
    }),
  );

  // Metadata table
  const metaItems: Array<{ label: string; value: string }> = [];
  if (doc.header.assessmentName) {
    metaItems.push({ label: 'Assessment', value: doc.header.assessmentName });
  }
  if (doc.header.assessmentId) {
    metaItems.push({ label: 'ID', value: doc.header.assessmentId });
  }
  metaItems.push(
    { label: 'Pathway', value: doc.executiveSummary.pathwayLabel },
    { label: 'Status', value: doc.header.assessmentStatus },
    { label: 'Generated', value: formatTimestamp(doc.header.generatedAt) },
  );

  elements.push(labelValueTable(metaItems, 18));

  return elements;
}

function buildExecutiveSummary(doc: PdfReportDocument): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];
  const summary = doc.executiveSummary;

  elements.push(sectionHeading('Assessment Summary'));

  if (summary.isIncomplete) {
    elements.push(
      new Paragraph({
        spacing: { before: 40, after: 100 },
        shading: { type: ShadingType.CLEAR, fill: COLORS.lightBg, color: COLORS.lightBg },
        border: {
          top: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
          left: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
          right: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
        },
        children: [
          new TextRun({
            text: 'Record status notice: ',
            font: FONT_FAMILY,
            size: 17,
            bold: true,
            color: COLORS.text,
          }),
          new TextRun({
            text: 'Pathway-critical items remain unresolved; do not treat the current record as a supported pathway conclusion.',
            font: FONT_FAMILY,
            size: 17,
            color: COLORS.text,
          }),
        ],
      }),
    );
  }

  elements.push(
    labelValueTable([
      { label: 'Record Status', value: summary.recordStatus },
      { label: 'Conditions for Reliance', value: summary.relianceQualification },
      { label: 'Recommended Next Action', value: summary.primaryNextAction },
    ]),
  );

  elements.push(subheading('Conclusion'));
  elements.push(bodyText(summary.pathwayConclusion));

  if (summary.summaryStatement && summary.summaryStatement !== summary.pathwayConclusion) {
    elements.push(subheading('Analytical Summary'));
    elements.push(
      sectionNote(
        'System-generated summary derived from the assessment logic; review against the record facts and cited sources.',
      ),
    );
    elements.push(bodyText(summary.summaryStatement));
  }

  return elements;
}

function buildAssessmentBasis(doc: PdfReportDocument): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];
  const basis = doc.assessmentBasis;

  elements.push(sectionHeading('Assessment Basis'));

  elements.push(subheading('Record Facts'));
  elements.push(
    sectionNote(
      'Copied from the assessment record as entered. Missing fields are shown as "Not provided."',
    ),
  );

  // Split record facts: short fields go in a table, long-text fields get stacked
  const shortFacts = basis.recordFacts.filter((f) => !f.isLongText);
  const longFacts = basis.recordFacts.filter((f) => f.isLongText);

  if (shortFacts.length > 0) {
    elements.push(
      labelValueTable(
        shortFacts.map((f) => ({ label: f.label, value: f.value, isMissing: f.isMissing })),
        32,
      ),
    );
  }

  // Long-text fields: label on its own line, value below with indent
  longFacts.forEach((fact) => {
    elements.push(
      new Paragraph({
        spacing: { before: 80, after: 20 },
        children: [
          new TextRun({
            text: fact.label,
            font: FONT_FAMILY,
            size: 17,
            bold: true,
            color: COLORS.textSecondary,
          }),
        ],
      }),
    );
    elements.push(
      new Paragraph({
        spacing: { before: 0, after: 60 },
        indent: { left: convertInchesToTwip(0.2) },
        children: [
          new TextRun({
            text: fact.value,
            font: FONT_FAMILY,
            size: 19,
            color: fact.isMissing ? COLORS.missingText : COLORS.text,
          }),
        ],
      }),
    );
  });

  if (basis.systemGeneratedBasis.length > 0) {
    elements.push(subheading('Derived Assessment Basis'));
    elements.push(
      sectionNote(
        'Derived by ChangePath from the recorded answers and decision logic. Analytical support, not source evidence.',
      ),
    );
    elements.push(...numberedList(basis.systemGeneratedBasis));
  }

  return elements;
}

function buildDecisionTrace(doc: PdfReportDocument): (Paragraph | Table)[] {
  if (doc.decisionTrace.steps.length === 0) return [];

  return [
    sectionHeading('Decision Logic Trace'),
    sectionNote(
      'Ordered logic steps applied to the current record to arrive at the present pathway assessment.',
    ),
    ...numberedList(doc.decisionTrace.steps),
  ];
}

function buildNarrative(doc: PdfReportDocument): (Paragraph | Table)[] {
  const narr = doc.narrative;
  const hasContent =
    narr.headlineReason || narr.supportingPoints.length > 0 || narr.verificationSteps.length > 0;
  if (!hasContent) return [];

  const elements: (Paragraph | Table)[] = [];

  elements.push(sectionHeading('Assessment Rationale'));
  elements.push(
    sectionNote(
      'System-generated explanatory text. Review against the record facts and cited sources before reliance.',
    ),
  );

  if (narr.headlineReason && narr.headlineReason !== doc.executiveSummary.summaryStatement) {
    elements.push(bodyText(narr.headlineReason));
  }

  narr.supportingPoints.forEach((point) => {
    elements.push(bodyText(point, { secondary: true, indent: convertInchesToTwip(0.2) }));
  });

  if (narr.verificationSteps.length > 0) {
    elements.push(subheading(narr.verificationTitle || 'Verification Focus'));
    elements.push(...numberedList(narr.verificationSteps));
  }

  return elements;
}

function buildOpenIssueBlock(issue: PdfOpenIssue, index: number): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];
  const kindLabel = issue.kind === 'expert-review' ? 'Expert Review' : 'Evidence Gap';

  // Issue header with tags
  elements.push(
    new Paragraph({
      spacing: { before: index === 0 ? 0 : 140, after: 40 },
      border: index > 0
        ? { top: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border, space: 6 } }
        : undefined,
      children: [
        tagRun(`Issue ${index + 1}`),
        new TextRun({ text: '  ', font: FONT_FAMILY, size: 15 }),
        tagRun(kindLabel),
      ],
    }),
  );

  // Issue title
  elements.push(
    new Paragraph({
      spacing: { before: 0, after: 60 },
      indent: { left: convertInchesToTwip(0.15) },
      children: [
        new TextRun({
          text: issue.title,
          font: FONT_FAMILY,
          size: 19,
          bold: true,
          color: COLORS.text,
        }),
      ],
    }),
  );

  // Issue details as a compact table
  const detailItems: Array<{ label: string; value: string }> = [];
  if (issue.meta) {
    detailItems.push({ label: 'Context', value: issue.meta });
  }
  detailItems.push({ label: 'Record Impact', value: issue.whyItMatters });
  detailItems.push({ label: 'Required Action', value: `${issue.actionLabel}: ${issue.actionNeeded}` });
  if (issue.sources.length > 0) {
    detailItems.push({ label: 'Basis Referenced', value: issue.sources.join('; ') });
  }

  elements.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      indent: { size: convertInchesToTwip(0.15), type: WidthType.DXA },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: COLORS.white },
        bottom: { style: BorderStyle.NONE, size: 0, color: COLORS.white },
        left: { style: BorderStyle.NONE, size: 0, color: COLORS.white },
        right: { style: BorderStyle.NONE, size: 0, color: COLORS.white },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: COLORS.white },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: COLORS.white },
      },
      rows: detailItems.map((item) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 22, type: WidthType.PERCENTAGE },
              borders: noBorders,
              margins: { top: 15, bottom: 15, right: 60 },
              children: [
                new Paragraph({
                  spacing: { before: 0, after: 0 },
                  children: [
                    new TextRun({
                      text: item.label,
                      font: FONT_FAMILY,
                      size: 15,
                      bold: true,
                      color: COLORS.textSecondary,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 78, type: WidthType.PERCENTAGE },
              borders: noBorders,
              margins: { top: 15, bottom: 15 },
              children: [
                new Paragraph({
                  spacing: { before: 0, after: 0 },
                  children: [
                    new TextRun({
                      text: item.value,
                      font: FONT_FAMILY,
                      size: 17,
                      color: COLORS.text,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ),
    }),
  );

  return elements;
}

function buildOpenIssues(doc: PdfReportDocument): (Paragraph | Table)[] {
  if (doc.openIssues.length === 0) return [];

  const n = doc.openIssues.length;
  const elements: (Paragraph | Table)[] = [];

  elements.push(sectionHeading('Open Issues Requiring Resolution'));
  elements.push(
    sectionNote(
      `${n} open item${n === 1 ? '' : 's'} that limit${n === 1 ? 's' : ''} reliance on the current pathway assessment until resolved or supplemented.`,
    ),
  );

  doc.openIssues.forEach((issue, index) => {
    elements.push(...buildOpenIssueBlock(issue, index));
  });

  return elements;
}

function buildAlternativePathways(doc: PdfReportDocument): (Paragraph | Table)[] {
  if (doc.alternativePathways.length === 0) return [];

  return [
    sectionHeading('Conditions That Could Affect the Pathway'),
    sectionNote(
      'Conditions identified by the assessment logic that could change, qualify, or overturn the current pathway assessment.',
    ),
    ...numberedList(doc.alternativePathways.map((ap) => ap.description)),
  ];
}

function buildSourcesCited(doc: PdfReportDocument): (Paragraph | Table)[] {
  if (doc.sourcesCited.length === 0) return [];

  return [
    sectionHeading('Sources Cited'),
    sectionNote(
      'Regulatory and standards references surfaced by the assessment logic. Citations indicate relevance, not statement-level attribution.',
    ),
    ...doc.sourcesCited.map(
      (source: PdfSourceCitation, i: number) =>
        new Paragraph({
          spacing: { before: 20, after: 30 },
          indent: { left: convertInchesToTwip(0.35), hanging: convertInchesToTwip(0.25) },
          children: [
            new TextRun({
              text: `${i + 1}.  `,
              font: FONT_FAMILY,
              size: 17,
              bold: true,
              color: COLORS.textSecondary,
            }),
            new TextRun({
              text: source.badge,
              font: FONT_FAMILY,
              size: 17,
              color: COLORS.text,
            }),
          ],
        }),
    ),
  ];
}

function buildReviewerNotes(doc: PdfReportDocument): (Paragraph | Table)[] {
  if (doc.reviewerNotes.length === 0) return [];

  const elements: (Paragraph | Table)[] = [];
  elements.push(sectionHeading('Reviewer Notes'));
  elements.push(
    sectionNote('User-entered annotations attached to this assessment. Not system-generated content.'),
  );

  doc.reviewerNotes.forEach((note) => {
    elements.push(
      new Paragraph({
        spacing: { before: 80, after: 20 },
        indent: { left: convertInchesToTwip(0.15) },
        children: [
          new TextRun({
            text: note.author,
            font: FONT_FAMILY,
            size: 15,
            bold: true,
            color: COLORS.textSecondary,
          }),
          new TextRun({
            text: ` — ${formatDateShort(note.timestamp)}`,
            font: FONT_FAMILY,
            size: 15,
            color: COLORS.textMuted,
          }),
        ],
      }),
    );
    elements.push(
      new Paragraph({
        spacing: { before: 0, after: 60 },
        indent: { left: convertInchesToTwip(0.15) },
        children: [
          new TextRun({
            text: note.text,
            font: FONT_FAMILY,
            size: 19,
            color: COLORS.text,
          }),
        ],
      }),
    );
  });

  return elements;
}

function buildClosing(doc: PdfReportDocument): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  elements.push(sectionHeading('Document Control'));

  elements.push(
    labelValueTable(
      [
        { label: 'Source', value: `Assessment record in ${doc.closing.generatedBy}` },
        { label: 'Generated', value: formatTimestamp(doc.closing.timestamp) },
        { label: 'Logic Version', value: doc.closing.schemaVersion },
        { label: 'Export Format', value: doc.closing.exportVersion },
      ],
      22,
    ),
  );

  // Disclaimer in a shaded box
  elements.push(
    new Paragraph({
      spacing: { before: 160, after: 0 },
      shading: { type: ShadingType.CLEAR, fill: COLORS.lightBg, color: COLORS.lightBg },
      border: {
        top: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border },
        bottom: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border },
        left: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border },
        right: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border },
      },
      children: [
        new TextRun({
          text: doc.closing.disclaimer,
          font: FONT_FAMILY,
          size: 17,
          italics: true,
          color: COLORS.textSecondary,
        }),
      ],
    }),
  );

  return elements;
}

/* ------------------------------------------------------------------ */
/*  Document assembly                                                  */
/* ------------------------------------------------------------------ */

export function buildDocxDocument(reportDoc: PdfReportDocument): Document {
  const headerText = reportDoc.header.assessmentId
    ? `${reportDoc.header.title}  |  ID: ${reportDoc.header.assessmentId}`
    : reportDoc.header.title;

  return new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT_FAMILY,
            size: 19,
            color: COLORS.text,
          },
          paragraph: {
            spacing: { line: 276 },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: convertInchesToTwip(8.5), height: convertInchesToTwip(11) },
            margin: {
              top: convertInchesToTwip(0.9),
              bottom: convertInchesToTwip(0.75),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                border: {
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border, space: 4 },
                },
                tabStops: [
                  {
                    type: TabStopType.RIGHT,
                    position: TabStopPosition.MAX,
                  },
                ],
                children: [
                  new TextRun({
                    text: headerText,
                    font: FONT_FAMILY,
                    size: 14,
                    color: COLORS.textMuted,
                  }),
                  new TextRun({
                    text: '\t',
                    font: FONT_FAMILY,
                    size: 14,
                  }),
                  new TextRun({
                    text: formatDateShort(reportDoc.header.generatedAt),
                    font: FONT_FAMILY,
                    size: 14,
                    color: COLORS.textMuted,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                border: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border, space: 4 },
                },
                tabStops: [
                  {
                    type: TabStopType.RIGHT,
                    position: TabStopPosition.MAX,
                  },
                ],
                children: [
                  new TextRun({
                    text: 'Internal assessment support record — not a regulatory determination',
                    font: FONT_FAMILY,
                    size: 13,
                    color: COLORS.textMuted,
                  }),
                  new TextRun({
                    text: '\t',
                    font: FONT_FAMILY,
                    size: 13,
                  }),
                  new TextRun({
                    text: 'Page ',
                    font: FONT_FAMILY,
                    size: 13,
                    color: COLORS.textMuted,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: FONT_FAMILY,
                    size: 13,
                    color: COLORS.textMuted,
                  }),
                  new TextRun({
                    text: ' of ',
                    font: FONT_FAMILY,
                    size: 13,
                    color: COLORS.textMuted,
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    font: FONT_FAMILY,
                    size: 13,
                    color: COLORS.textMuted,
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          ...buildTitleSection(reportDoc),
          ...buildExecutiveSummary(reportDoc),
          ...buildAssessmentBasis(reportDoc),
          ...buildDecisionTrace(reportDoc),
          ...buildNarrative(reportDoc),
          ...buildOpenIssues(reportDoc),
          ...buildAlternativePathways(reportDoc),
          ...buildSourcesCited(reportDoc),
          ...buildReviewerNotes(reportDoc),
          ...buildClosing(reportDoc),
        ],
      },
    ],
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
