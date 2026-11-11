import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  COVER_FOOTER,
  COVER_INTRO,
  COVER_SIGNING_LINE,
  PARTY_ROWS,
  buildCoverSections,
  resolveRuns,
  type Block,
  type NdaForm,
  type Run,
} from "@/lib/nda";

const FONT_FAMILY = "NotoSerif";
let fontsRegisteredFrom: string | null = null;

/**
 * Register the bundled Noto Serif (Latin, Greek and Cyrillic; SIL OFL, see
 * public/fonts/OFL.txt). The built-in PDF fonts only cover Latin-1, so names and
 * addresses such as "Łódź" would lose characters.
 *
 * @param baseUrl where NotoSerif-Regular.ttf and NotoSerif-Bold.ttf are served:
 * "/fonts" in the browser, or a directory path when rendering in Node.
 */
export function registerPdfFonts(baseUrl: string) {
  if (fontsRegisteredFrom === baseUrl) return;
  Font.register({
    family: FONT_FAMILY,
    fonts: [
      { src: `${baseUrl}/NotoSerif-Regular.ttf`, fontWeight: 400 },
      { src: `${baseUrl}/NotoSerif-Bold.ttf`, fontWeight: 700 },
    ],
  });
  // Legal text reads better without automatic hyphenation (e.g. "incorpo-rating").
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegisteredFrom = baseUrl;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 64,
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 1.45,
    color: "#111",
  },
  title: { fontWeight: 700, fontSize: 19, marginBottom: 12 },
  heading: { fontWeight: 700, fontSize: 15, marginBottom: 10 },
  kicker: { fontWeight: 700, fontSize: 9.5, marginBottom: 6 },
  sectionTitle: { fontWeight: 700, marginTop: 10 },
  paragraph: { marginBottom: 8, textAlign: "justify" },
  bold: { fontWeight: 700 },
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
  labelCell: { width: "22%", fontWeight: 700 },
  partyCell: { width: "39%", textAlign: "center" },
});

function PdfRuns({ runs, form }: { runs: Run[]; form: NdaForm }) {
  return (
    <>
      {resolveRuns(runs, form).map((segment, i) => (
        <Text key={i} style={segment.style === "plain" ? undefined : styles.bold}>
          {segment.text}
        </Text>
      ))}
    </>
  );
}

export function NdaPdf({ terms, form }: { terms: Block[]; form: NdaForm }) {
  return (
    <Document title="Mutual Non-Disclosure Agreement" author="Prelegal">
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Mutual Non-Disclosure Agreement</Text>
        <Text style={styles.kicker}>USING THIS MUTUAL NON-DISCLOSURE AGREEMENT</Text>
        <Text style={styles.paragraph}>{COVER_INTRO}</Text>

        {buildCoverSections(form).map((section) => (
          <View key={section.title}>
            <Text style={styles.sectionTitle} minPresenceAhead={30}>
              {section.title}
            </Text>
            {section.lines.map((line, i) => (
              <Text key={i}>{line}</Text>
            ))}
          </View>
        ))}

        <Text style={[styles.paragraph, { marginTop: 14 }]} minPresenceAhead={120}>
          {COVER_SIGNING_LINE}
        </Text>

        <View style={styles.table}>
          <View style={styles.row} wrap={false}>
            <Text style={[styles.cell, styles.labelCell]} />
            <Text style={[styles.cell, styles.partyCell, styles.bold]}>PARTY 1</Text>
            <Text style={[styles.cell, styles.partyCell, styles.bold]}>PARTY 2</Text>
          </View>
          {PARTY_ROWS.map((row) => (
            <View key={row.label} style={styles.row} wrap={false}>
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
