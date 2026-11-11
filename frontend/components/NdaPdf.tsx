import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  COVER_FOOTER,
  COVER_INTRO,
  COVER_SIGNING_LINE,
  PARTY_ROWS,
  buildCoverSections,
  fieldValue,
  type Block,
  type NdaForm,
  type Run,
} from "@/lib/nda";

const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 64,
    fontFamily: "Times-Roman",
    fontSize: 10.5,
    lineHeight: 1.4,
    color: "#111",
  },
  title: { fontFamily: "Times-Bold", fontSize: 20, marginBottom: 12 },
  heading: { fontFamily: "Times-Bold", fontSize: 16, marginBottom: 10 },
  kicker: { fontFamily: "Times-Bold", fontSize: 10, marginBottom: 6 },
  sectionTitle: { fontFamily: "Times-Bold", marginTop: 10 },
  paragraph: { marginBottom: 8, textAlign: "justify" },
  bold: { fontFamily: "Times-Bold" },
  small: { fontSize: 8.5, color: "#555", marginTop: 10 },
  table: { marginTop: 10, borderTopWidth: 1, borderLeftWidth: 1, borderColor: "#444" },
  row: { flexDirection: "row" },
  cell: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#444",
    padding: 5,
    minHeight: 26,
  },
  labelCell: { width: "22%", fontFamily: "Times-Bold" },
  partyCell: { width: "39%", textAlign: "center" },
});

function PdfRuns({ runs, form }: { runs: Run[]; form: NdaForm }) {
  return (
    <>
      {runs.map((run, i) => {
        if (run.kind === "text") {
          return (
            <Text key={i} style={run.bold ? styles.bold : undefined}>
              {run.text}
            </Text>
          );
        }
        const value = fieldValue(form, run.field);
        return (
          <Text key={i} style={styles.bold}>
            {value || `[${run.field}]`}
          </Text>
        );
      })}
    </>
  );
}

export function NdaPdf({ terms, form }: { terms: Block[]; form: NdaForm }) {
  const sections = buildCoverSections(form);
  return (
    <Document title="Mutual Non-Disclosure Agreement" author="Prelegal">
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Mutual Non-Disclosure Agreement</Text>
        <Text style={styles.kicker}>USING THIS MUTUAL NON-DISCLOSURE AGREEMENT</Text>
        <Text style={styles.paragraph}>{COVER_INTRO}</Text>

        {sections.map((section) => (
          <View key={section.title} wrap={false}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.lines.some(Boolean) ? (
              section.lines.map((line, i) => <Text key={i}>{line}</Text>)
            ) : (
              <Text>[{section.title}]</Text>
            )}
          </View>
        ))}

        <Text style={[styles.paragraph, { marginTop: 14 }]}>{COVER_SIGNING_LINE}</Text>

        <View style={styles.table} wrap={false}>
          <View style={styles.row}>
            <Text style={[styles.cell, styles.labelCell]} />
            <Text style={[styles.cell, styles.partyCell, styles.bold]}>PARTY 1</Text>
            <Text style={[styles.cell, styles.partyCell, styles.bold]}>PARTY 2</Text>
          </View>
          {PARTY_ROWS.map((row) => (
            <View key={row.label} style={styles.row}>
              <Text style={[styles.cell, styles.labelCell]}>{row.label}</Text>
              <Text style={[styles.cell, styles.partyCell]}>{row.get(form.party1)}</Text>
              <Text style={[styles.cell, styles.partyCell]}>{row.get(form.party2)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.small}>{COVER_FOOTER}</Text>
      </Page>

      <Page size="LETTER" style={styles.page}>
        {terms.map((block, i) => {
          if (block.kind === "heading") {
            return (
              <Text key={i} style={styles.heading}>
                <PdfRuns runs={block.runs} form={form} />
              </Text>
            );
          }
          return (
            <Text
              key={i}
              style={block.kind === "footer" ? [styles.paragraph, styles.small] : styles.paragraph}
            >
              <PdfRuns runs={block.runs} form={form} />
            </Text>
          );
        })}
      </Page>
    </Document>
  );
}
