import React from "react";
import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";
import type { ResumeTemplateData } from "./types";

Font.register({ family: "NotoSansSC", src: "https://fonts.gstatic.com/s/notosanssc/v36/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG9_FnYxNbPzS5HE.woff2" });

const styles = StyleSheet.create({
  page: { padding: 44, fontFamily: "NotoSansSC", backgroundColor: "#ffffff", fontSize: 9 },
  tagline: { fontSize: 7.5, letterSpacing: 2, color: "#777777", marginBottom: 5, textTransform: "uppercase" },
  name: { fontSize: 26, fontFamily: "NotoSansSC", color: "#111111", marginBottom: 10 },
  divider: { borderBottomWidth: 0.75, borderBottomColor: "#cccccc", marginBottom: 14 },
  row: { flexDirection: "row" },
  leftCol: { width: "30%", paddingRight: 14 },
  rightCol: { width: "70%", paddingLeft: 14 },
  sectionLabel: {
    fontSize: 7,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: "#666666",
    marginBottom: 5,
    marginTop: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
    paddingBottom: 3,
  },
  body: { fontSize: 9, lineHeight: 1.55, color: "#333333", marginBottom: 4 },
  contactLine: { fontSize: 8.5, color: "#444444", marginBottom: 3 },
  expHeader: { fontSize: 9, fontFamily: "NotoSansSC", color: "#111111", marginBottom: 2 },
  expMeta: { fontSize: 8, color: "#777777", marginBottom: 4 },
  skillRow: { flexDirection: "row", marginBottom: 5, alignItems: "center" },
  skillName: { fontSize: 8.5, color: "#333333", flex: 1 },
  skillBar: { width: 50, height: 3, backgroundColor: "#e5e5e5", borderRadius: 2 },
  skillFill: { height: 3, backgroundColor: "#888888", borderRadius: 2 },
  photoCircle: { width: 60, height: 60, borderRadius: 30, marginBottom: 8 },
});

function sanitiseName(raw: string): string {
  return (raw ?? "").replace(/^[#\s]+|[#\s]+$/g, "").trim();
}

export function MunichPdf({ data }: { data: ResumeTemplateData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        {data.photoUrl && data.photoUrl.startsWith("data:image") ? (
          <Image style={styles.photoCircle} src={data.photoUrl} />
        ) : null}
        {data.jobTitle ? (
          <Text style={styles.tagline}>{data.jobTitle}</Text>
        ) : null}
        <Text style={styles.name}>{sanitiseName(data.name)}</Text>
        <View style={styles.divider} />

        {/* Two-column body */}
        <View style={styles.row}>
          {/* Left column — Contact, Skills */}
          <View style={styles.leftCol}>
            <Text style={styles.sectionLabel}>Contact</Text>
            {data.email ? <Text style={styles.contactLine}>{data.email}</Text> : null}
            {data.phone ? <Text style={styles.contactLine}>{data.phone}</Text> : null}
            {data.location ? <Text style={styles.contactLine}>{data.location}</Text> : null}

            {data.skills.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>Skills</Text>
                {data.skills.map((skill, i) => (
                  <View key={i} style={styles.skillRow}>
                    <Text style={styles.skillName}>{skill.name}</Text>
                    <View style={styles.skillBar}>
                      <View style={[styles.skillFill, { width: `${skill.level}%` }]} />
                    </View>
                  </View>
                ))}
              </>
            ) : null}

            {data.educations.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>Education</Text>
                {data.educations.map((edu, i) => (
                  <View key={i} style={{ marginBottom: 8 }}>
                    <Text style={[styles.body, { fontFamily: "NotoSansSC" }]}>
                      {edu.qualification}
                    </Text>
                    {edu.fieldOfStudy ? (
                      <Text style={styles.body}>{edu.fieldOfStudy}</Text>
                    ) : null}
                    <Text style={styles.contactLine}>{edu.institution}</Text>
                    {edu.graduationYear ? (
                      <Text style={styles.contactLine}>{edu.graduationYear}</Text>
                    ) : null}
                  </View>
                ))}
              </>
            ) : null}
          </View>

          {/* Right column — Summary, Experience */}
          <View style={styles.rightCol}>
            {data.summary ? (
              <>
                <Text style={styles.sectionLabel}>Summary</Text>
                <Text style={styles.body}>{data.summary}</Text>
              </>
            ) : null}

            {data.experiences.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>Work Experience</Text>
                {data.experiences.map((exp, i) => (
                  <View key={i} style={{ marginBottom: 10 }}>
                    <Text style={styles.expHeader}>{exp.title}</Text>
                    <Text style={styles.expMeta}>
                      {[exp.company, exp.startDate && exp.endDate ? `${exp.startDate} – ${exp.endDate}` : (exp.startDate || exp.endDate)]
                        .filter(Boolean)
                        .join("  •  ")}
                    </Text>
                    {exp.description ? (
                      <Text style={styles.body}>{exp.description}</Text>
                    ) : null}
                  </View>
                ))}
              </>
            ) : null}

            {data.extras?.map((extra, i) => (
              <View key={i}>
                <Text style={styles.sectionLabel}>{extra.title}</Text>
                <Text style={styles.body}>{extra.content}</Text>
              </View>
            ))}
          </View>
        </View>
      </Page>
    </Document>
  );
}
