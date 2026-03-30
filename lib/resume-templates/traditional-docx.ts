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
} from "docx";
import type { ResumeTemplateData } from "./types";

function noBorders() {
  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } as const;
  return { top: none, bottom: none, left: none, right: none, insideH: none, insideV: none };
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: text.toUpperCase(), size: 22, bold: true, color: "111111" })],
    spacing: { before: 200, after: 80 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 8, color: "111111" },
    },
  });
}

export async function generateTraditionalDocx(data: ResumeTemplateData): Promise<Blob> {
  const children: (Paragraph | Table)[] = [
    // Header: name left, photo placeholder right (using table)
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders(),
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: noBorders(),
              children: [
                new Paragraph({
                  children: [new TextRun({ text: data.name, size: 44, bold: true, color: "111111" })],
                  spacing: { after: 40 },
                }),
                ...(data.jobTitle
                  ? [
                      new Paragraph({
                        children: [new TextRun({ text: data.jobTitle, size: 20, bold: true, color: "444444" })],
                        spacing: { after: 40 },
                      }),
                    ]
                  : []),
                ...[data.email, data.phone, data.location]
                  .filter(Boolean)
                  .map(
                    (c) =>
                      new Paragraph({
                        children: [new TextRun({ text: c!, size: 18, color: "555555" })],
                        spacing: { after: 30 },
                      }),
                  ),
              ],
            }),
            new TableCell({
              borders: noBorders(),
              width: { size: 20, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "[Photo]",
                      size: 16,
                      color: "999999",
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  border: {
                    top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
                    bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
                    left: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
                    right: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
                  },
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    // Thick decorative divider
    new Paragraph({
      border: { bottom: { style: BorderStyle.THICK, size: 24, color: "111111" } },
      spacing: { before: 120, after: 160 },
      children: [],
    }),
  ];

  // Personal Data section
  if (data.email || data.phone || data.location || data.jobTitle) {
    children.push(sectionHeading("Personal Data"));
    const dataRows: { label: string; value: string }[] = [];
    if (data.jobTitle) dataRows.push({ label: "Position Applied", value: data.jobTitle });
    if (data.email) dataRows.push({ label: "Email", value: data.email });
    if (data.phone) dataRows.push({ label: "Phone", value: data.phone });
    if (data.location) dataRows.push({ label: "Address", value: data.location });

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: noBorders(),
        rows: dataRows.map(
          ({ label, value }) =>
            new TableRow({
              children: [
                new TableCell({
                  borders: noBorders(),
                  width: { size: 28, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: label, size: 18, bold: true, color: "333333" })],
                    }),
                  ],
                }),
                new TableCell({
                  borders: noBorders(),
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: value, size: 18, color: "333333" })],
                    }),
                  ],
                }),
              ],
            }),
        ),
      }),
    );
  }

  if (data.summary) {
    children.push(sectionHeading("Profile Summary"));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: data.summary, size: 18, color: "333333" })],
        spacing: { after: 80 },
      }),
    );
  }

  if (data.skills.length > 0) {
    children.push(sectionHeading("Skills & Interest"));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: data.skills.map((s) => s.name).join("  •  "), size: 18, color: "333333" })],
        spacing: { after: 80 },
      }),
    );
  }

  if (data.educations.length > 0) {
    children.push(sectionHeading("Education"));
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: noBorders(),
        rows: data.educations.map(
          (edu, i) =>
            new TableRow({
              children: [
                new TableCell({
                  borders: noBorders(),
                  width: { size: 18, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: i === 0 ? "TERTIARY" : "SECONDARY",
                          size: 16,
                          bold: true,
                          color: "111111",
                          characterSpacing: 40,
                        }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  borders: noBorders(),
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: [edu.qualification, edu.fieldOfStudy].filter(Boolean).join(", "),
                          size: 18,
                          bold: true,
                          color: "111111",
                        }),
                      ],
                      spacing: { after: 30 },
                    }),
                    new Paragraph({
                      children: [new TextRun({ text: edu.institution, size: 18, color: "333333" })],
                      spacing: { after: 30 },
                    }),
                    ...(edu.graduationYear
                      ? [
                          new Paragraph({
                            children: [
                              new TextRun({ text: `Graduated ${edu.graduationYear}`, size: 16, color: "777777" }),
                            ],
                            spacing: { after: 80 },
                          }),
                        ]
                      : []),
                  ],
                }),
              ],
            }),
        ),
      }),
    );
  }

  if (data.experiences.length > 0) {
    children.push(sectionHeading("Work Experience"));
    data.experiences.forEach((exp) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: exp.title, size: 20, bold: true, color: "111111" }),
            exp.company ? new TextRun({ text: `, ${exp.company}`, size: 18, color: "333333" }) : new TextRun({ text: "" }),
          ],
          spacing: { after: 40 },
        }),
      );
      const dateStr = [exp.startDate, exp.endDate].filter(Boolean).join(" – ");
      if (dateStr) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: dateStr, size: 16, color: "777777" })],
            spacing: { after: 40 },
          }),
        );
      }
      if (exp.description) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: exp.description, size: 18, color: "333333" })],
            spacing: { after: 120 },
          }),
        );
      }
    });
  }

  data.extras?.forEach((extra) => {
    children.push(sectionHeading(extra.title));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: extra.content, size: 18, color: "333333" })],
        spacing: { after: 80 },
      }),
    );
  });

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBlob(doc);
}
