import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { ResumeTemplateData } from "./types";

const styles = StyleSheet.create({
  page: { padding: 44, backgroundColor: "#ffffff", fontSize: 9 },
  name: { fontSize: 26, color: "#111111", marginBottom: 2 },
  addressLine: { fontSize: 9, color: "#444444", marginBottom: 2 },
  contactRow: { flexDirection: "row", marginBottom: 10 },
  contactItem: { fontSize: 9, color: "#444444", marginRight: 24 },
  divider: { borderBottomWidth: 0.75, borderBottomColor: "#cccccc", marginBottom: 14, marginTop: 4 },
  row: { flexDirection: "row", marginBottom: 12 },
  labelCol: { width: "18%", paddingRight: 10 },
  contentCol: { flex: 1 },
  sectionLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#000000",
    paddingTop: 1,
  },
  jobTitle: { fontSize: 10, color: "#111111", marginBottom: 2 },
  jobMeta: { fontSize: 8.5, color: "#777777", marginBottom: 4 },
  body: { fontSize: 9, lineHeight: 1.55, color: "#333333", marginBottom: 3 },
  bulletRow: { flexDirection: "row", marginBottom: 2 },
  bulletDot: { fontSize: 9, color: "#333333", marginRight: 5, marginTop: 1 },
  bulletText: { flex: 1, fontSize: 9, lineHeight: 1.5, color: "#333333" },
  skillLine: { fontSize: 9, color: "#333333", marginBottom: 3 },
  subDivider: { borderBottomWidth: 0.5, borderBottomColor: "#e5e5e5", marginVertical: 6 },
  photoImg: { width: 55, height: 55, borderRadius: 4 },
});

function sanitiseName(raw: string): string {
  return (raw ?? "").replace(/^[#\s]+|[#\s]+$/g, "").trim();
}

export function ModernMinimalPdf({ data }: { data: ResumeTemplateData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header: name/contact left, optional photo right */}
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{sanitiseName(data.name)}</Text>
            {data.location ? <Text style={styles.addressLine}>{data.location}</Text> : null}
            {(data.phone || data.email) ? (
              <View style={styles.contactRow}>
                {data.phone ? <Text style={styles.contactItem}>{data.phone}</Text> : null}
                {data.email ? <Text style={styles.contactItem}>{data.email}</Text> : null}
              </View>
            ) : null}
          </View>
          {data.photoUrl && data.photoUrl.startsWith("data:image") ? (
            <Image style={styles.photoImg} src={data.photoUrl} />
          ) : null}
        </View>
        <View style={styles.divider} />

        {/* Experience */}
        {data.experiences.length > 0 ? (
          <View style={styles.row}>
            <View style={styles.labelCol}>
              <Text style={styles.sectionLabel}>Exper{"\n"}ience</Text>
            </View>
            <View style={styles.contentCol}>
              {data.experiences.map((exp, i) => (
                <View key={i} style={{ marginBottom: 10 }}>
                  <Text style={styles.jobTitle}>
                    {exp.title}
                    {exp.company ? `, ${exp.company}` : ""}
                  </Text>
                  <Text style={styles.jobMeta}>
                    {[exp.location, exp.startDate && exp.endDate ? `${exp.startDate} – ${exp.endDate}` : (exp.startDate || exp.endDate)]
                      .filter(Boolean)
                      .join("  •  ")}
                  </Text>
                  {exp.description
                    ? exp.description
                        .split("\n")
                        .filter(Boolean)
                        .map((line, li) => (
                          <View key={li} style={styles.bulletRow}>
                            <Text style={styles.bulletDot}>—</Text>
                            <Text style={styles.bulletText}>{line}</Text>
                          </View>
                        ))
                    : null}
                  {i < data.experiences.length - 1 ? <View style={styles.subDivider} /> : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Summary (after experience in minimal style) */}
        {data.summary ? (
          <View style={styles.row}>
            <View style={styles.labelCol}>
              <Text style={styles.sectionLabel}>Profile</Text>
            </View>
            <View style={styles.contentCol}>
              <Text style={styles.body}>{data.summary}</Text>
            </View>
          </View>
        ) : null}

        {/* Education */}
        {data.educations.length > 0 ? (
          <View style={styles.row}>
            <View style={styles.labelCol}>
              <Text style={styles.sectionLabel}>Educa{"\n"}tion</Text>
            </View>
            <View style={styles.contentCol}>
              {data.educations.map((edu, i) => (
                <View key={i} style={{ marginBottom: 6 }}>
                  <Text style={styles.jobTitle}>
                    {[edu.qualification, edu.fieldOfStudy].filter(Boolean).join(", ")}
                  </Text>
                  <Text style={styles.body}>{edu.institution}</Text>
                  {edu.graduationYear ? (
                    <Text style={styles.jobMeta}>{edu.graduationYear}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Skills */}
        {data.skills.length > 0 ? (
          <View style={styles.row}>
            <View style={styles.labelCol}>
              <Text style={styles.sectionLabel}>Skills</Text>
            </View>
            <View style={styles.contentCol}>
              {data.skills.map((skill, i) => (
                <Text key={i} style={styles.skillLine}>
                  — {skill.name}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        {data.extras?.map((extra, i) => (
          <View key={i} style={styles.row}>
            <View style={styles.labelCol}>
              <Text style={styles.sectionLabel}>{extra.title}</Text>
            </View>
            <View style={styles.contentCol}>
              <Text style={styles.body}>{extra.content}</Text>
            </View>
          </View>
        ))}
      </Page>
    </Document>
  );
}
