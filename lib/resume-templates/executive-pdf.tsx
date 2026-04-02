import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { ResumeTemplateData } from "./types";

const styles = StyleSheet.create({
  page: { padding: 40, backgroundColor: "#ffffff", fontSize: 9.5 },
  nameRow: { flexDirection: "row", justifyContent: "center", marginBottom: 4 },
  nameText: { fontSize: 18, fontFamily: "NotoSansSC", color: "#111111" },
  contactBar: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    fontSize: 8.5,
    color: "#555555",
    marginBottom: 6,
  },
  pipe: { marginHorizontal: 6, color: "#aaaaaa" },
  jobTitle: {
    textAlign: "center",
    fontSize: 11,
    fontFamily: "NotoSansSC",
    color: "#222222",
    marginBottom: 14,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  summaryText: { fontSize: 9.5, lineHeight: 1.6, color: "#333333", marginBottom: 12 },
  skillGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 14 },
  skillChip: {
    fontSize: 8.5,
    color: "#333333",
    marginRight: 16,
    marginBottom: 4,
  },
  sectionDivTop: { borderTopWidth: 1, borderTopColor: "#111111", marginBottom: 2 },
  sectionHeading: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "#111111",
    marginBottom: 2,
  },
  sectionDivBottom: { borderBottomWidth: 1, borderBottomColor: "#111111", marginBottom: 10 },
  expRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  companyText: { fontSize: 9, color: "#333333" },
  dateText: { fontSize: 8.5, color: "#777777" },
  expTitle: { fontSize: 10, color: "#111111", marginBottom: 4 },
  expDesc: { fontSize: 9, lineHeight: 1.55, color: "#333333", marginBottom: 6 },
  bulletRow: { flexDirection: "row", marginBottom: 3 },
  bulletDot: { fontSize: 9, color: "#333333", marginRight: 4 },
  bulletText: { flex: 1, fontSize: 9, lineHeight: 1.5, color: "#333333" },
  photoImg: { width: 50, height: 50, borderRadius: 25, marginLeft: 14 },
});

function sanitiseName(raw: string): string {
  return (raw ?? "").replace(/^[#\s]+|[#\s]+$/g, "").trim();
}

export function ExecutivePdf({ data }: { data: ResumeTemplateData }) {
  const contacts = [data.email, data.phone, data.location].filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header: text block (centered, flex:1) + optional photo right */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.nameText, { textAlign: "center" }]}>{sanitiseName(data.name)}</Text>
            {contacts.length > 0 ? (
              <View style={styles.contactBar}>
                {contacts.map((c, i) => (
                  <React.Fragment key={i}>
                    <Text>{c}</Text>
                    {i < contacts.length - 1 ? (
                      <Text style={styles.pipe}>|</Text>
                    ) : null}
                  </React.Fragment>
                ))}
              </View>
            ) : null}
            {data.jobTitle ? (
              <Text style={[styles.jobTitle, { marginBottom: 0 }]}>{data.jobTitle}</Text>
            ) : null}
          </View>
          {data.photoUrl && data.photoUrl.startsWith("data:image") ? (
            <Image style={styles.photoImg} src={data.photoUrl} />
          ) : null}
        </View>

        {/* Professional summary */}
        {data.summary ? <Text style={styles.summaryText}>{data.summary}</Text> : null}

        {/* Skills grid */}
        {data.skills.length > 0 ? (
          <View style={styles.skillGrid}>
            {data.skills.map((skill, i) => (
              <Text key={i} style={styles.skillChip}>
                {"• "}
                {skill.name}
              </Text>
            ))}
          </View>
        ) : null}

        {/* Professional Experience */}
        {data.experiences.length > 0 ? (
          <>
            <View style={styles.sectionDivTop} />
            <Text style={styles.sectionHeading}>Professional Experience</Text>
            <View style={styles.sectionDivBottom} />

            {data.experiences.map((exp, i) => (
              <View key={i} style={{ marginBottom: 12 }}>
                <View style={styles.expRow}>
                  <Text style={styles.companyText}>{exp.company}</Text>
                  <Text style={styles.dateText}>
                    {[exp.startDate, exp.endDate].filter(Boolean).join(" – ")}
                  </Text>
                </View>
                <Text style={styles.expTitle}>{exp.title}</Text>
                {exp.description ? (
                  <>
                    {exp.description.split("\n").filter(Boolean).map((line, li) => (
                      <View key={li} style={styles.bulletRow}>
                        <Text style={styles.bulletDot}>•</Text>
                        <Text style={styles.bulletText}>{line}</Text>
                      </View>
                    ))}
                  </>
                ) : null}
              </View>
            ))}
          </>
        ) : null}

        {/* Education */}
        {data.educations.length > 0 ? (
          <>
            <View style={styles.sectionDivTop} />
            <Text style={styles.sectionHeading}>Education</Text>
            <View style={styles.sectionDivBottom} />
            {data.educations.map((edu, i) => (
              <View key={i} style={styles.expRow}>
                <Text style={[styles.companyText, { fontFamily: "NotoSansSC" }]}>
                  {[edu.qualification, edu.fieldOfStudy].filter(Boolean).join(", ")} — {edu.institution}
                </Text>
                {edu.graduationYear ? (
                  <Text style={styles.dateText}>{edu.graduationYear}</Text>
                ) : null}
              </View>
            ))}
          </>
        ) : null}

        {data.extras?.map((extra, i) => (
          <View key={i} style={{ marginTop: 10 }}>
            <View style={styles.sectionDivTop} />
            <Text style={styles.sectionHeading}>{extra.title}</Text>
            <View style={styles.sectionDivBottom} />
            <Text style={styles.expDesc}>{extra.content}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}
