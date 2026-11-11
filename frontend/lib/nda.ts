/**
 * Form model and template parsing for the Common Paper Mutual NDA.
 *
 * The standard terms (templates/Mutual-NDA.md) mark each reference to the cover
 * page as <span class="coverpage_link">Field</span>. We parse the markdown once
 * into a small block/run model, and resolve runs against the form with
 * `resolveRuns`, so the HTML preview and the PDF share the same wording rules.
 *
 * Short values (effective date, governing law, jurisdiction) are written into
 * the clauses. Longer terms (purpose, MNDA term, term of confidentiality) stay
 * as the template's defined terms, which the template says take their meaning
 * from the cover page; the cover page shows the full values.
 */

export type MndaTermType = "expires" | "untilTerminated";
export type ConfidentialityType = "years" | "perpetuity";

export interface PartyDetails {
  name: string;
  title: string;
  company: string;
  noticeAddress: string;
  date: string; // ISO yyyy-mm-dd
}

export interface NdaForm {
  purpose: string;
  effectiveDate: string; // ISO yyyy-mm-dd
  mndaTermType: MndaTermType;
  mndaTermYears: string;
  confidentialityType: ConfidentialityType;
  confidentialityYears: string;
  governingLaw: string;
  jurisdiction: string;
  modifications: string;
  party1: PartyDetails;
  party2: PartyDetails;
}

export const DEFAULT_PURPOSE =
  "Evaluating whether to enter into a business relationship with the other party.";

const emptyParty = (): PartyDetails => ({
  name: "",
  title: "",
  company: "",
  noticeAddress: "",
  date: "",
});

export function createEmptyForm(): NdaForm {
  return {
    purpose: DEFAULT_PURPOSE,
    effectiveDate: "",
    mndaTermType: "expires",
    mndaTermYears: "1",
    confidentialityType: "years",
    confidentialityYears: "1",
    governingLaw: "",
    jurisdiction: "",
    modifications: "",
    party1: emptyParty(),
    party2: emptyParty(),
  };
}

/* ------------------------------------------------------------------ */
/* Values                                                              */
/* ------------------------------------------------------------------ */

export const FIELD_NAMES = [
  "Purpose",
  "Effective Date",
  "MNDA Term",
  "Term of Confidentiality",
  "Governing Law",
  "Jurisdiction",
] as const;

/** Cover-page fields that standard-terms placeholders can refer to. */
export type FieldName = (typeof FIELD_NAMES)[number];

/** Fields whose value is written into the clauses; the rest stay as defined terms. */
const INLINE_FIELDS = ["Effective Date", "Governing Law", "Jurisdiction"] as const;
type InlineField = (typeof INLINE_FIELDS)[number];

const isFieldName = (s: string): s is FieldName =>
  (FIELD_NAMES as readonly string[]).includes(s);

const isInlineField = (f: FieldName): f is InlineField =>
  (INLINE_FIELDS as readonly string[]).includes(f);

/** A whole number of years from 1 to 999, or null if the input is not one. */
export function parseYears(input: string): number | null {
  const s = input.trim();
  return /^[1-9]\d{0,2}$/.test(s) ? Number(s) : null;
}

function yearsText(input: string): string {
  const n = parseYears(input);
  return n === null ? "" : `${n} ${n === 1 ? "year" : "years"}`;
}

export function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return "";
  const [y, m, d] = match.slice(1).map(Number);
  // Build in UTC so the displayed day never shifts with the time zone, and set
  // the year separately because Date.UTC maps years 0-99 to 1900-1999.
  const date = new Date(0);
  date.setUTCFullYear(y, m - 1, d);
  // Reject dates that rolled over, such as February 31.
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return "";
  }
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** The text an inline field resolves to, or "" while it is unfilled. */
export function fieldValue(form: NdaForm, field: InlineField): string {
  switch (field) {
    case "Effective Date":
      return formatDate(form.effectiveDate);
    case "Governing Law":
      // The clause already says "the State of", so accept "Delaware" or "State of Delaware".
      return form.governingLaw.trim().replace(/^(the\s+)?state\s+of\s+/i, "");
    case "Jurisdiction":
      return form.jurisdiction.trim();
  }
}

/* ------------------------------------------------------------------ */
/* Template parsing                                                    */
/* ------------------------------------------------------------------ */

export type Run =
  | { kind: "text"; text: string; bold: boolean }
  | { kind: "field"; field: FieldName };

export type Block =
  | { kind: "heading"; runs: Run[] }
  | { kind: "paragraph"; runs: Run[] }
  | { kind: "footer"; runs: Run[] };

const TOKEN =
  /<span class="coverpage_link">([^<]+)<\/span>|\*\*([^*]+)\*\*|\[([^\]]+)\]\([^)]+\)/g;

/** Turn one line of template markdown into runs. */
export function parseInline(line: string): Run[] {
  const runs: Run[] = [];
  let last = 0;
  const push = (text: string, bold = false) => {
    if (text) runs.push({ kind: "text", text, bold });
  };
  for (const match of line.matchAll(TOKEN)) {
    const [whole, fieldName, boldText, linkText] = match;
    let before = line.slice(last, match.index);
    last = match.index + whole.length;
    // "commences on the <Effective Date>" reads "on the November 10, 2026" once
    // filled in, so the article goes.
    if (fieldName === "Effective Date") before = before.replace(/\bthe\s+$/, "");
    push(before);
    if (fieldName !== undefined) {
      if (!isFieldName(fieldName)) {
        throw new Error(`Unknown template field: "${fieldName}"`);
      }
      runs.push({ kind: "field", field: fieldName });
    } else if (boldText !== undefined) {
      push(boldText, true);
    } else {
      push(linkText);
    }
  }
  push(line.slice(last));
  return runs;
}

/** Parse the Standard Terms markdown into renderable blocks. */
export function parseStandardTerms(markdown: string): Block[] {
  const chunks = markdown
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((c) => c.trim())
    .filter(Boolean);

  return chunks.map((chunk, i): Block => {
    if (chunk.startsWith("# ")) {
      return { kind: "heading", runs: parseInline(chunk.slice(2)) };
    }
    if (i === chunks.length - 1 && /CC BY 4\.0/.test(chunk)) {
      return { kind: "footer", runs: parseInline(chunk) };
    }
    return { kind: "paragraph", runs: parseInline(chunk) };
  });
}

/* ------------------------------------------------------------------ */
/* Resolving runs against the form                                     */
/* ------------------------------------------------------------------ */

export type SegmentStyle =
  | "plain"
  | "bold"
  /** A value the user filled in. */
  | "value"
  /** A value the user has not filled in yet, shown as "[Field]". */
  | "placeholder"
  /** A defined term that takes its meaning from the cover page. */
  | "term";

export interface Segment {
  text: string;
  style: SegmentStyle;
}

/** Resolve runs to styled text. Both the preview and the PDF render these. */
export function resolveRuns(runs: Run[], form: NdaForm): Segment[] {
  return runs.map((run): Segment => {
    if (run.kind === "text") {
      return { text: run.text, style: run.bold ? "bold" : "plain" };
    }
    if (!isInlineField(run.field)) return { text: run.field, style: "term" };
    const value = fieldValue(form, run.field);
    return value
      ? { text: value, style: "value" }
      : { text: `[${run.field}]`, style: "placeholder" };
  });
}

/* ------------------------------------------------------------------ */
/* Cover page                                                          */
/* ------------------------------------------------------------------ */

export interface CoverSection {
  title: string;
  /** Lines of text, or a single "[Title]" line while the section is unfilled. */
  lines: string[];
  placeholder: boolean;
}

const TRADE_SECRET_CLAUSE =
  "but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.";

export function buildCoverSections(form: NdaForm): CoverSection[] {
  const mndaTerm =
    form.mndaTermType === "untilTerminated"
      ? "Continues until terminated in accordance with the terms of the MNDA."
      : yearsText(form.mndaTermYears) &&
        `Expires ${yearsText(form.mndaTermYears)} from Effective Date.`;

  const confidentiality =
    form.confidentialityType === "perpetuity"
      ? "In perpetuity."
      : yearsText(form.confidentialityYears) &&
        `${yearsText(form.confidentialityYears)} from Effective Date, ${TRADE_SECRET_CLAUSE}`;

  const law = fieldValue(form, "Governing Law");
  const jurisdiction = fieldValue(form, "Jurisdiction");

  const section = (title: string, lines: (string | false)[]): CoverSection => {
    const filled = lines.filter((l): l is string => Boolean(l));
    return filled.length
      ? { title, lines: filled, placeholder: false }
      : { title, lines: [`[${title}]`], placeholder: true };
  };

  return [
    section("Purpose", [form.purpose.trim()]),
    section("Effective Date", [fieldValue(form, "Effective Date")]),
    section("MNDA Term", [mndaTerm]),
    section("Term of Confidentiality", [confidentiality]),
    section("Governing Law & Jurisdiction", [
      law && `Governing Law: ${law}`,
      jurisdiction && `Jurisdiction: ${jurisdiction}`,
    ]),
    { title: "MNDA Modifications", lines: [form.modifications.trim() || "None."], placeholder: false },
  ];
}

export const COVER_INTRO =
  "This Mutual Non-Disclosure Agreement (the “MNDA”) consists of: (1) this Cover Page (“Cover Page”) and (2) the Common Paper Mutual NDA Standard Terms Version 1.0 (“Standard Terms”) identical to those posted at commonpaper.com/standards/mutual-nda/1.0. Any modifications of the Standard Terms should be made on the Cover Page, which will control over conflicts with the Standard Terms.";

export const COVER_SIGNING_LINE =
  "By signing this Cover Page, each party agrees to enter into this MNDA as of the Effective Date.";

export const COVER_FOOTER =
  "Common Paper Mutual Non-Disclosure Agreement (Version 1.0) free to use under CC BY 4.0.";

export const PARTY_ROWS: { label: string; get: (p: PartyDetails) => string }[] = [
  { label: "Signature", get: () => "" },
  { label: "Print Name", get: (p) => p.name },
  { label: "Title", get: (p) => p.title },
  { label: "Company", get: (p) => p.company },
  { label: "Notice Address", get: (p) => p.noticeAddress },
  { label: "Date", get: (p) => formatDate(p.date) },
];

/* ------------------------------------------------------------------ */
/* Checks before download                                              */
/* ------------------------------------------------------------------ */

/** Problems that make the document wrong; the download is blocked until fixed. */
export function blockingErrors(form: NdaForm): string[] {
  const errors: string[] = [];
  if (form.mndaTermType === "expires" && parseYears(form.mndaTermYears) === null) {
    errors.push("Enter a whole number of years (1–999) for the MNDA term.");
  }
  if (form.confidentialityType === "years" && parseYears(form.confidentialityYears) === null) {
    errors.push("Enter a whole number of years (1–999) for the term of confidentiality.");
  }
  const bad = unsupportedPdfCharacters(form);
  if (bad.length) {
    errors.push(
      `The PDF font cannot display these characters: ${bad.join(" ")}. Please replace them.`,
    );
  }
  return errors;
}

/** Fields still empty. The user may choose to download anyway. */
export function missingFields(form: NdaForm): string[] {
  const missing: [string, string][] = [
    ["Purpose", form.purpose],
    ["Effective date", form.effectiveDate],
    ["Governing law", form.governingLaw],
    ["Jurisdiction", form.jurisdiction],
  ];
  for (const [label, p] of [
    ["Party 1", form.party1],
    ["Party 2", form.party2],
  ] as const) {
    missing.push(
      [`${label} name`, p.name],
      [`${label} company`, p.company],
      [`${label} notice address`, p.noticeAddress],
    );
  }
  return missing.filter(([, value]) => !value.trim()).map(([label]) => label);
}

// Noto Serif, the PDF font, covers Latin, Greek and Cyrillic plus common punctuation
// and symbols. Anything else (CJK, Arabic, Hebrew, Indic scripts, emoji) would be
// dropped from the PDF while still showing in the preview.
const PDF_SUPPORTED = /^[\u0000-ԯḀ-῿ -⁯₠-₿℀-⅏←-⇿∀-⋿]$/;

export function unsupportedPdfCharacters(form: NdaForm): string[] {
  const text = [
    form.purpose,
    form.governingLaw,
    form.jurisdiction,
    form.modifications,
    ...[form.party1, form.party2].flatMap((p) => [p.name, p.title, p.company, p.noticeAddress]),
  ].join("");
  const bad = new Set<string>();
  for (const ch of text) {
    if (!PDF_SUPPORTED.test(ch) && !/\s/.test(ch)) bad.add(ch);
  }
  return [...bad].slice(0, 10);
}

/** Suggested file name for the downloaded PDF. */
export function pdfFileName(form: NdaForm): string {
  const names = [form.party1.company, form.party2.company]
    .map((n) => n.trim().replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, ""))
    .filter(Boolean);
  return names.length === 2
    ? `Mutual-NDA-${names[0]}-${names[1]}.pdf`
    : "Mutual-NDA.pdf";
}
