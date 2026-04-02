import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { ResumeTemplateData } from "./types";

const styles = StyleSheet.create({
  page: { padding: 44, backgroundColor: "#ffffff", fontSize: 9 },
  headerRow: { flexDirection: "row", marginBottom: 12 },
  headerLeft: { flex: 1 },
  name: { fontSize: 22, color: "#111111", marginBottom: 4 },
  headerContact: { fontSize: 9, color: "#555555", marginBottom: 2 },
  photoBox: {
    width: 72,
    height: 72,
    borderWidth: 1,
    borderColor: "#cccccc",
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  photoImage: { width: 72, height: 72, objectFit: "cover" },
  photoPlaceholder: { fontSize: 8, color: "#999999", textAlign: "center" },
  thickDivider: { borderBottomWidth: 3, borderBottomColor: "#111111", marginBottom: 16 },
  sectionHeading: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
    marginBottom: 6,
    marginTop: 14,
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: "#cccccc",
    paddingBottom: 3,
  },
  tableRow: { flexDirection: "row", marginBottom: 4 },
  labelCell: { width: "28%", fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#333333" },
  valueCell: { flex: 1, fontSize: 8.5, color: "#333333", lineHeight: 1.5 },
  body: { fontSize: 9, lineHeight: 1.55, color: "#333333", marginBottom: 4 },
  eduLabel: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});

function sanitiseName(raw: string): string {
  return (raw ?? "").replace(/^[#\s]+|[#\s]+$/g, "").trim();
}

export function TraditionalPdf({ data }: { data: ResumeTemplateData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header: name/contact left, photo right */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.name}>{sanitiseName(data.name)}</Text>
            {data.jobTitle ? (
              <Text style={[styles.headerContact, { fontFamily: "NotoSansSC" }]}>
                {data.jobTitle}
              </Text>
            ) : null}
            {data.email ? <Text style={styles.headerContact}>{data.email}</Text> : null}
            {data.phone ? <Text style={styles.headerContact}>{data.phone}</Text> : null}
            {data.location ? <Text style={styles.headerContact}>{data.location}</Text> : null}
          </View>
          <View style={styles.photoBox}>
            {data.photoUrl?.startsWith("data:image") ? (
              <Image style={styles.photoImage} src={data.photoUrl} />
            ) : (
              <Text style={styles.photoPlaceholder}>{"Photo"}</Text>
            )}
          </View>
        </View>

        <View style={styles.thickDivider} />

        {/* Personal Data */}
        {(data.email || data.phone || data.location || data.jobTitle) ? (
          <>
            <Text style={styles.sectionHeading}>Personal Data</Text>
            {data.jobTitle ? (
              <View style={styles.tableRow}>
                <Text style={styles.labelCell}>Position Applied</Text>
                <Text style={styles.valueCell}>{data.jobTitle}</Text>
              </View>
            ) : null}
            {data.email ? (
              <View style={styles.tableRow}>
                <Text style={styles.labelCell}>Email</Text>
                <Text style={styles.valueCell}>{data.email}</Text>
              </View>
            ) : null}
            {data.phone ? (
              <View style={styles.tableRow}>
                <Text style={styles.labelCell}>Phone</Text>
                <Text style={styles.valueCell}>{data.phone}</Text>
              </View>
            ) : null}
            {data.location ? (
              <View style={styles.tableRow}>
                <Text style={styles.labelCell}>Address</Text>
                <Text style={styles.valueCell}>{data.location}</Text>
              </View>
            ) : null}
          </>
        ) : null}

        {/* Summary */}
        {data.summary ? (
          <>
            <Text style={styles.sectionHeading}>Profile Summary</Text>
            <Text style={styles.body}>{data.summary}</Text>
          </>
        ) : null}

        {/* Skills */}
        {data.skills.length > 0 ? (
          <>
            <Text style={styles.sectionHeading}>Skills &amp; Interest</Text>
            <Text style={styles.body}>{data.skills.map((s) => s.name).join("  •  ")}</Text>
          </>
        ) : null}

        {/* Education */}
        {data.educations.length > 0 ? (
          <>
            <Text style={styles.sectionHeading}>Education</Text>
            {data.educations.map((edu, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.eduLabel}>
                  {i === 0 ? "TERTIARY" : "SECONDARY"}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.body, { fontFamily: "NotoSansSC" }]}>
                    {[edu.qualification, edu.fieldOfStudy].filter(Boolean).join(", ")}
                  </Text>
                  <Text style={styles.body}>{edu.institution}</Text>
                  {edu.graduationYear ? (
                    <Text style={[styles.body, { color: "#777777" }]}>
                      Graduated {edu.graduationYear}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </>
        ) : null}

        {/* Work Experience */}
        {data.experiences.length > 0 ? (
          <>
            <Text style={styles.sectionHeading}>Work Experience</Text>
            {data.experiences.map((exp, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.eduLabel}>
                  {exp.startDate && exp.endDate
                    ? `${exp.startDate}–${exp.endDate}`
                    : exp.startDate || exp.endDate || ""}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.body, { fontFamily: "NotoSansSC" }]}>
                    {exp.title}
                    {exp.company ? `, ${exp.company}` : ""}
                  </Text>
                  {exp.description ? (
                    <Text style={styles.body}>{exp.description}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </>
        ) : null}

        {data.extras?.map((extra, i) => (
          <View key={i}>
            <Text style={styles.sectionHeading}>{extra.title}</Text>
            <Text style={styles.body}>{extra.content}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}
