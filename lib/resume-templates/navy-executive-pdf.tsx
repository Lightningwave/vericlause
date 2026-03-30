import React from "react";
import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";
import type { ResumeTemplateData } from "./types";

Font.register({ family: "NotoSansSC", src: "https://fonts.gstatic.com/s/notosanssc/v36/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG9_FnYxNbPzS5HE.woff2" });

const NAVY = "#1B2E4B";
const GOLD = "#C9A040";
const LIGHT_GOLD = "#E8C97A";

const styles = StyleSheet.create({
  page: { fontFamily: "NotoSansSC", backgroundColor: "#ffffff", fontSize: 9 },
  header: {
    backgroundColor: NAVY,
    paddingVertical: 28,
    paddingHorizontal: 44,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 0,
  },
  photoBorder: { borderWidth: 2, borderColor: "#C9A040", borderRadius: 34, padding: 2 },
  headerPhoto: { width: 65, height: 65, borderRadius: 32 },
  headerName: {
    fontSize: 26,
    fontFamily: "NotoSansSC",
    color: GOLD,
    letterSpacing: 3,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 8,
    color: LIGHT_GOLD,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    textAlign: "center",
  },
  body: { flexDirection: "row", flex: 1, paddingHorizontal: 0 },
  leftCol: {
    width: "35%",
    backgroundColor: "#f5f7fa",
    padding: 24,
    paddingTop: 20,
  },
  rightCol: {
    flex: 1,
    padding: 24,
    paddingTop: 20,
    borderLeftWidth: 0.75,
    borderLeftColor: "#dde3eb",
  },
  leftSectionLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: NAVY,
    marginBottom: 6,
    marginTop: 14,
  },
  leftItem: { fontSize: 8.5, color: "#333333", marginBottom: 3, lineHeight: 1.45 },
  rightSectionLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: NAVY,
    marginBottom: 6,
    marginTop: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#dde3eb",
    paddingBottom: 3,
  },
  expHeader: { fontSize: 9.5, fontFamily: "NotoSansSC", color: "#111111", marginBottom: 2 },
  expMeta: { fontSize: 8, color: "#888888", marginBottom: 4 },
  bodyText: { fontSize: 9, lineHeight: 1.55, color: "#333333", marginBottom: 4 },
  bulletRow: { flexDirection: "row", marginBottom: 3 },
  bulletDot: { fontSize: 9, color: NAVY, marginRight: 5 },
  bulletText: { flex: 1, fontSize: 9, lineHeight: 1.5, color: "#333333" },
  skillItem: { fontSize: 8.5, color: "#333333", marginBottom: 3 },
});

function sanitiseName(raw: string): string {
  return (raw ?? "").replace(/^[#\s]+|[#\s]+$/g, "").trim();
}

export function NavyExecutivePdf({ data }: { data: ResumeTemplateData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Dark navy header */}
        <View style={styles.header}>
          <View style={{ width: 72 }} />
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={styles.headerName}>{sanitiseName(data.name)}</Text>
            {data.jobTitle ? <Text style={styles.headerTitle}>{data.jobTitle}</Text> : null}
          </View>
          <View style={{ width: 72, alignItems: "flex-end" }}>
            {data.photoUrl && data.photoUrl.startsWith("data:image") ? (
              <View style={styles.photoBorder}>
                <Image style={styles.headerPhoto} src={data.photoUrl} />
              </View>
            ) : null}
          </View>
        </View>

        {/* Two-column body */}
        <View style={styles.body}>
          {/* Left column */}
          <View style={styles.leftCol}>
            <Text style={styles.leftSectionLabel}>Contact</Text>
            {data.email ? <Text style={styles.leftItem}>{data.email}</Text> : null}
            {data.phone ? <Text style={styles.leftItem}>{data.phone}</Text> : null}
            {data.location ? <Text style={styles.leftItem}>{data.location}</Text> : null}

            {data.educations.length > 0 ? (
              <>
                <Text style={styles.leftSectionLabel}>Education</Text>
                {data.educations.map((edu, i) => (
                  <View key={i} style={{ marginBottom: 6 }}>
                    <Text style={[styles.leftItem, { fontFamily: "NotoSansSC" }]}>
                      {edu.qualification}
                    </Text>
                    {edu.fieldOfStudy ? (
                      <Text style={styles.leftItem}>{edu.fieldOfStudy}</Text>
                    ) : null}
                    <Text style={[styles.leftItem, { color: "#777777" }]}>
                      {edu.institution}
                    </Text>
                    {edu.graduationYear ? (
                      <Text style={[styles.leftItem, { color: "#999999" }]}>
                        {edu.graduationYear}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </>
            ) : null}

            {data.skills.length > 0 ? (
              <>
                <Text style={styles.leftSectionLabel}>Skills</Text>
                {data.skills.map((skill, i) => (
                  <Text key={i} style={styles.skillItem}>
                    {"• "}{skill.name}
                  </Text>
                ))}
              </>
            ) : null}
          </View>

          {/* Right column */}
          <View style={styles.rightCol}>
            {data.summary ? (
              <>
                <Text style={styles.rightSectionLabel}>Profile</Text>
                <Text style={styles.bodyText}>{data.summary}</Text>
              </>
            ) : null}

            {data.experiences.length > 0 ? (
              <>
                <Text style={styles.rightSectionLabel}>Professional Experience</Text>
                {data.experiences.map((exp, i) => (
                  <View key={i} style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={[styles.expMeta, { color: NAVY }]}>{exp.company}</Text>
                      <Text style={styles.expMeta}>
                        {[exp.startDate, exp.endDate].filter(Boolean).join(" – ")}
                      </Text>
                    </View>
                    <Text style={styles.expHeader}>{exp.title}</Text>
                    {exp.description
                      ? exp.description
                          .split("\n")
                          .filter(Boolean)
                          .map((line, li) => (
                            <View key={li} style={styles.bulletRow}>
                              <Text style={styles.bulletDot}>•</Text>
                              <Text style={styles.bulletText}>{line}</Text>
                            </View>
                          ))
                      : null}
                  </View>
                ))}
              </>
            ) : null}

            {data.extras?.map((extra, i) => (
              <View key={i}>
                <Text style={styles.rightSectionLabel}>{extra.title}</Text>
                <Text style={styles.bodyText}>{extra.content}</Text>
              </View>
            ))}
          </View>
        </View>
      </Page>
    </Document>
  );
}
