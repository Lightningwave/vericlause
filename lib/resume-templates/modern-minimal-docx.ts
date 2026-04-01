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

function labelRow(label: string, contentCells: Paragraph[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders(),
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: noBorders(),
            width: { size: 18, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: label.toUpperCase(),
                    size: 15,
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
            children: contentCells,
          }),
        ],
      }),
    ],
  });
}

export async function generateModernMinimalDocx(data: ResumeTemplateData): Promise<Blob> {
  const children: (Paragraph | Table)[] = [];

  // Name
  children.push(
    new Paragraph({
      children: [new TextRun({ text: data.name, size: 44, bold: true, color: "000000" })],
      spacing: { after: 40 },
    }),
  );

  // Location
  if (data.location) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: data.location, size: 18, color: "444444" })],
        spacing: { after: 30 },
      }),
    );
  }

  // Phone / Email row
  const contactParts = [data.phone, data.email].filter(Boolean);
  if (contactParts.length > 0) {
    children.push(
      new Paragraph({
        children: contactParts
          .map((c, i) => [
            new TextRun({ text: c!, size: 18, color: "444444" }),
            i < contactParts.length - 1
              ? new TextRun({ text: "    ", size: 18 })
              : new TextRun({ text: "" }),
          ])
          .flat(),
        spacing: { after: 40 },
      }),
    );
  }

  // Divider
  children.push(
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" } },
      spacing: { before: 40, after: 160 },
      children: [],
    }),
  );

  // Experience
  if (data.experiences.length > 0) {
    const expRows: Paragraph[] = [];
    data.experiences.forEach((exp, idx) => {
      expRows.push(
        new Paragraph({
          children: [
            new TextRun({ text: exp.title, size: 19, bold: true, color: "111111" }),
            exp.company
              ? new TextRun({ text: `, ${exp.company}`, size: 18, color: "333333" })
              : new TextRun({ text: "" }),
          ],
          spacing: { after: 30 },
        }),
      );
      const meta = [
        exp.location,
        exp.startDate && exp.endDate
          ? `${exp.startDate} – ${exp.endDate}`
          : exp.startDate || exp.endDate,
      ]
        .filter(Boolean)
        .join("  •  ");
      if (meta) {
        expRows.push(
          new Paragraph({
            children: [new TextRun({ text: meta, size: 17, color: "777777" })],
            spacing: { after: 40 },
          }),
        );
      }
      if (exp.description) {
        exp.description
          .split("\n")
          .filter(Boolean)
          .forEach((line) => {
            expRows.push(
              new Paragraph({
                children: [
                  new TextRun({ text: "— ", size: 18, color: "333333" }),
                  new TextRun({ text: line, size: 18, color: "333333" }),
                ],
                spacing: { after: 30 },
              }),
            );
          });
      }
      if (idx < data.experiences.length - 1) {
        expRows.push(
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "EEEEEE" } },
            spacing: { after: 60 },
            children: [],
          }),
        );
      } else {
        expRows.push(new Paragraph({ children: [], spacing: { after: 60 } }));
      }
    });
    children.push(labelRow("Experience", expRows));
  }

  // Profile / Summary
  if (data.summary) {
    children.push(
      labelRow("Profile", [
        new Paragraph({
          children: [new TextRun({ text: data.summary, size: 18, color: "333333" })],
          spacing: { after: 80 },
        }),
      ]),
    );
  }

  // Education
  if (data.educations.length > 0) {
    const eduRows: Paragraph[] = [];
    data.educations.forEach((edu) => {
      eduRows.push(
        new Paragraph({
          children: [
            new TextRun({
              text: [edu.qualification, edu.fieldOfStudy].filter(Boolean).join(", "),
              size: 19,
              bold: true,
              color: "111111",
            }),
          ],
          spacing: { after: 30 },
        }),
      );
      eduRows.push(
        new Paragraph({
          children: [new TextRun({ text: edu.institution, size: 18, color: "333333" })],
          spacing: { after: 30 },
        }),
      );
      if (edu.graduationYear) {
        eduRows.push(
          new Paragraph({
            children: [new TextRun({ text: edu.graduationYear, size: 17, color: "777777" })],
            spacing: { after: 60 },
          }),
        );
      }
    });
    children.push(labelRow("Education", eduRows));
  }

  // Skills
  if (data.skills.length > 0) {
    const skillRows = data.skills.map(
      (skill) =>
        new Paragraph({
          children: [new TextRun({ text: `— ${skill.name}`, size: 18, color: "333333" })],
          spacing: { after: 30 },
        }),
    );
    children.push(labelRow("Skills", skillRows));
  }

  // Extras
  data.extras?.forEach((extra) => {
    children.push(
      labelRow(extra.title, [
        new Paragraph({
          children: [new TextRun({ text: extra.content, size: 18, color: "333333" })],
          spacing: { after: 80 },
        }),
      ]),
    );
  });

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBlob(doc);
}
