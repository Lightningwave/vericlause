import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Packer,
  AlignmentType,
  WidthType,
  BorderStyle,
  ShadingType,
} from "docx";
import type { ResumeTemplateData } from "./types";

const NAVY = "1B2E4B";
const GOLD = "C9A040";
const LIGHT_BG = "F5F7FA";

function noBorders() {
  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } as const;
  return { top: none, bottom: none, left: none, right: none, insideH: none, insideV: none };
}

function leftSectionLabel(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: text.toUpperCase(),
        size: 14,
        bold: true,
        color: NAVY,
        characterSpacing: 60,
      }),
    ],
    spacing: { before: 160, after: 60 },
  });
}

function rightSectionLabel(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: text.toUpperCase(),
        size: 14,
        bold: true,
        color: NAVY,
        characterSpacing: 60,
      }),
    ],
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "DDE3EB" },
    },
    spacing: { before: 160, after: 60 },
  });
}

export async function generateNavyExecutiveDocx(data: ResumeTemplateData): Promise<Blob> {
  // ── Left column (35%) ───────────────────────────────────────────────
  const leftChildren: Paragraph[] = [
    leftSectionLabel("Contact"),
    ...[data.email, data.phone, data.location]
      .filter(Boolean)
      .map(
        (c) =>
          new Paragraph({
            children: [new TextRun({ text: c!, size: 17, color: "444444" })],
            spacing: { after: 40 },
          }),
      ),
  ];

  if (data.educations.length > 0) {
    leftChildren.push(leftSectionLabel("Education"));
    data.educations.forEach((edu) => {
      leftChildren.push(
        new Paragraph({
          children: [new TextRun({ text: edu.qualification, size: 18, bold: true, color: "111111" })],
          spacing: { after: 20 },
        }),
      );
      if (edu.fieldOfStudy) {
        leftChildren.push(
          new Paragraph({
            children: [new TextRun({ text: edu.fieldOfStudy, size: 17, color: "444444" })],
            spacing: { after: 20 },
          }),
        );
      }
      leftChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: edu.institution, size: 16, color: "777777" }),
            edu.graduationYear
              ? new TextRun({ text: `  ${edu.graduationYear}`, size: 16, color: "999999" })
              : new TextRun({ text: "" }),
          ],
          spacing: { after: 80 },
        }),
      );
    });
  }

  if (data.skills.length > 0) {
    leftChildren.push(leftSectionLabel("Skills"));
    data.skills.forEach((skill) => {
      leftChildren.push(
        new Paragraph({
          children: [new TextRun({ text: `• ${skill.name}`, size: 17, color: "333333" })],
          spacing: { after: 40 },
        }),
      );
    });
  }

  // ── Right column (65%) ──────────────────────────────────────────────
  const rightChildren: Paragraph[] = [];

  if (data.summary) {
    rightChildren.push(rightSectionLabel("Profile"));
    rightChildren.push(
      new Paragraph({
        children: [new TextRun({ text: data.summary, size: 18, color: "333333" })],
        spacing: { after: 100 },
      }),
    );
  }

  if (data.experiences.length > 0) {
    rightChildren.push(rightSectionLabel("Professional Experience"));
    data.experiences.forEach((exp) => {
      rightChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: exp.company, size: 17, color: NAVY }),
            new TextRun({ text: "    " }),
            new TextRun({
              text: [exp.startDate, exp.endDate].filter(Boolean).join(" – "),
              size: 16,
              color: "888888",
            }),
          ],
          spacing: { after: 20 },
        }),
      );
      rightChildren.push(
        new Paragraph({
          children: [new TextRun({ text: exp.title, size: 19, bold: true, color: "111111" })],
          spacing: { after: 40 },
        }),
      );
      if (exp.description) {
        exp.description
          .split("\n")
          .filter(Boolean)
          .forEach((line) => {
            rightChildren.push(
              new Paragraph({
                children: [
                  new TextRun({ text: "•  ", size: 18, color: NAVY }),
                  new TextRun({ text: line, size: 18, color: "333333" }),
                ],
                spacing: { after: 30 },
              }),
            );
          });
      }
      rightChildren.push(new Paragraph({ children: [], spacing: { after: 80 } }));
    });
  }

  data.extras?.forEach((extra) => {
    rightChildren.push(rightSectionLabel(extra.title));
    rightChildren.push(
      new Paragraph({
        children: [new TextRun({ text: extra.content, size: 18, color: "333333" })],
        spacing: { after: 80 },
      }),
    );
  });

  const doc = new Document({
    sections: [
      {
        children: [
          // ── Navy header ──────────────────────────────────────────
          new Paragraph({
            children: [
              new TextRun({
                text: data.name.toUpperCase(),
                size: 52,
                color: GOLD,
                characterSpacing: 60,
              }),
            ],
            alignment: AlignmentType.CENTER,
            shading: { type: ShadingType.SOLID, fill: NAVY, color: NAVY },
            spacing: { before: 280, after: 80 },
          }),
          ...(data.jobTitle
            ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: data.jobTitle.toUpperCase(),
                      size: 16,
                      color: "E8C97A",
                      characterSpacing: 60,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  shading: { type: ShadingType.SOLID, fill: NAVY, color: NAVY },
                  spacing: { after: 280 },
                }),
              ]
            : [
                new Paragraph({
                  children: [],
                  shading: { type: ShadingType.SOLID, fill: NAVY, color: NAVY },
                  spacing: { after: 280 },
                }),
              ]),
          // ── Two-column body ───────────────────────────────────────
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorders(),
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 35, type: WidthType.PERCENTAGE },
                    borders: noBorders(),
                    shading: { type: ShadingType.SOLID, fill: LIGHT_BG, color: LIGHT_BG },
                    children: leftChildren,
                  }),
                  new TableCell({
                    width: { size: 65, type: WidthType.PERCENTAGE },
                    borders: {
                      ...noBorders(),
                      left: { style: BorderStyle.SINGLE, size: 6, color: "DDE3EB" },
                    },
                    children: rightChildren,
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}
