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

function sectionRule(label: string): Paragraph[] {
  return [
    new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 8, color: "111111" } },
      spacing: { before: 200, after: 40 },
      children: [
        new TextRun({
          text: label.toUpperCase(),
          size: 18,
          bold: true,
          characterSpacing: 60,
          color: "111111",
        }),
      ],
    }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: "111111" } },
      spacing: { after: 100 },
      children: [],
    }),
  ];
}

export async function generateExecutiveDocx(data: ResumeTemplateData): Promise<Blob> {
  const children: (Paragraph | Table)[] = [];

  // Centered name
  children.push(
    new Paragraph({
      children: [new TextRun({ text: data.name, size: 36, color: "111111" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
    }),
  );

  // Contact bar: email | phone | location
  const contacts = [data.email, data.phone, data.location].filter(Boolean);
  if (contacts.length > 0) {
    children.push(
      new Paragraph({
        children: contacts
          .map((c, i) => [
            new TextRun({ text: c!, size: 17, color: "555555" }),
            i < contacts.length - 1
              ? new TextRun({ text: "  |  ", size: 17, color: "AAAAAA" })
              : new TextRun({ text: "" }),
          ])
          .flat(),
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
      }),
    );
  }

  // Centered bold job title
  if (data.jobTitle) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: data.jobTitle.toUpperCase(),
            size: 22,
            bold: true,
            color: "222222",
            characterSpacing: 40,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
      }),
    );
  }

  // Summary
  if (data.summary) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: data.summary, size: 19, color: "333333" })],
        spacing: { after: 120 },
      }),
    );
  }

  // Skills grid: three-column table
  if (data.skills.length > 0) {
    const rows: TableRow[] = [];
    for (let i = 0; i < data.skills.length; i += 3) {
      const cols = data.skills.slice(i, i + 3);
      rows.push(
        new TableRow({
          children: cols.map(
            (skill) =>
              new TableCell({
                borders: noBorders(),
                width: { size: 33, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: `• ${skill.name}`, size: 17, color: "333333" })],
                    spacing: { after: 40 },
                  }),
                ],
              }),
          ),
        }),
      );
    }
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: noBorders(),
        rows,
      }),
    );
  }

  // Professional Experience
  if (data.experiences.length > 0) {
    children.push(...sectionRule("Professional Experience"));
    data.experiences.forEach((exp) => {
      // Company and date right-aligned on same line
      children.push(
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
                      children: [new TextRun({ text: exp.company, size: 18, color: "333333" })],
                    }),
                  ],
                }),
                new TableCell({
                  borders: noBorders(),
                  width: { size: 25, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: [exp.startDate, exp.endDate].filter(Boolean).join(" – "),
                          size: 17,
                          color: "777777",
                        }),
                      ],
                      alignment: AlignmentType.RIGHT,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      );
      children.push(
        new Paragraph({
          children: [new TextRun({ text: exp.title, size: 20, bold: true, color: "111111" })],
          spacing: { after: 60 },
        }),
      );
      if (exp.description) {
        exp.description
          .split("\n")
          .filter(Boolean)
          .forEach((line) => {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({ text: "• ", size: 18, bold: true, color: "111111" }),
                  new TextRun({ text: line, size: 18, color: "333333" }),
                ],
                spacing: { after: 40 },
              }),
            );
          });
      }
      children.push(new Paragraph({ children: [], spacing: { after: 80 } }));
    });
  }

  // Education
  if (data.educations.length > 0) {
    children.push(...sectionRule("Education"));
    data.educations.forEach((edu) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: [edu.qualification, edu.fieldOfStudy].filter(Boolean).join(", "),
              size: 18,
              bold: true,
              color: "111111",
            }),
            new TextRun({ text: `  —  ${edu.institution}`, size: 18, color: "333333" }),
          ],
          spacing: { after: 60 },
        }),
      );
    });
  }

  data.extras?.forEach((extra) => {
    children.push(...sectionRule(extra.title));
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
