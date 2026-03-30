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
  HeadingLevel,
} from "docx";
import type { ResumeTemplateData } from "./types";

function noBorders() {
  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } as const;
  return { top: none, bottom: none, left: none, right: none, insideH: none, insideV: none };
}

function sectionLabel(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: text.toUpperCase(),
        size: 16,
        bold: true,
        color: "666666",
        characterSpacing: 60,
      }),
    ],
    spacing: { before: 160, after: 60 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD" },
    },
  });
}

export async function generateMunichDocx(data: ResumeTemplateData): Promise<Blob> {
  const leftChildren: (Paragraph | Table)[] = [
    sectionLabel("Contact"),
    ...[data.email, data.phone, data.location]
      .filter(Boolean)
      .map(
        (c) =>
          new Paragraph({
            children: [new TextRun({ text: c!, size: 18, color: "444444" })],
            spacing: { after: 40 },
          }),
      ),
  ];

  if (data.skills.length > 0) {
    leftChildren.push(sectionLabel("Skills"));
    data.skills.forEach((skill) => {
      leftChildren.push(
        new Paragraph({
          children: [new TextRun({ text: skill.name, size: 18, color: "333333" })],
          spacing: { after: 40 },
        }),
      );
    });
  }

  if (data.educations.length > 0) {
    leftChildren.push(sectionLabel("Education"));
    data.educations.forEach((edu) => {
      leftChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: edu.qualification, size: 18, bold: true, color: "111111" }),
          ],
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

  const rightChildren: (Paragraph | Table)[] = [];

  if (data.summary) {
    rightChildren.push(sectionLabel("Summary"));
    rightChildren.push(
      new Paragraph({
        children: [new TextRun({ text: data.summary, size: 18, color: "333333" })],
        spacing: { after: 100 },
      }),
    );
  }

  if (data.experiences.length > 0) {
    rightChildren.push(sectionLabel("Work Experience"));
    data.experiences.forEach((exp) => {
      rightChildren.push(
        new Paragraph({
          children: [new TextRun({ text: exp.title, size: 20, bold: true, color: "111111" })],
          spacing: { after: 40 },
        }),
      );
      const meta = [
        exp.company,
        exp.startDate && exp.endDate ? `${exp.startDate} – ${exp.endDate}` : exp.startDate || exp.endDate,
      ]
        .filter(Boolean)
        .join("  •  ");
      if (meta) {
        rightChildren.push(
          new Paragraph({
            children: [new TextRun({ text: meta, size: 16, color: "777777" })],
            spacing: { after: 40 },
          }),
        );
      }
      if (exp.description) {
        rightChildren.push(
          new Paragraph({
            children: [new TextRun({ text: exp.description, size: 18, color: "333333" })],
            spacing: { after: 120 },
          }),
        );
      }
    });
  }

  data.extras?.forEach((extra) => {
    rightChildren.push(sectionLabel(extra.title));
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
          // Header
          ...(data.jobTitle
            ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: data.jobTitle.toUpperCase(),
                      size: 16,
                      color: "777777",
                      characterSpacing: 60,
                    }),
                  ],
                  spacing: { after: 60 },
                }),
              ]
            : []),
          new Paragraph({
            children: [new TextRun({ text: data.name, size: 52, color: "111111" })],
            spacing: { after: 80 },
          }),
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" } },
            spacing: { after: 160 },
            children: [],
          }),
          // Two-column body table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorders(),
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    children: leftChildren,
                    borders: noBorders(),
                  }),
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    children: rightChildren,
                    borders: noBorders(),
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
