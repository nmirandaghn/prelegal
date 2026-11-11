/**
 * Form model and template parsing for the Common Paper Mutual NDA.
 *
 * The standard terms (templates/Mutual-NDA.md) mark each value taken from the
 * cover page as <span class="coverpage_link">Field</span>. We parse the
 * markdown once into a small block/run model that both the HTML preview and
 * the PDF renderer consume, so the two outputs cannot drift apart.
 */

export type MndaTermType = "expires" | "untilTerminated";
export type ConfidentialityType = "years" | "perpetuity";

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

export interface PartyDetails {
  name: string;
  title: string;
  company: string;
  noticeAddress: string;
  date: string; // ISO yyyy-mm-dd
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

/** Cover-page fields that standard-terms placeholders can refer to. */
export type FieldName =
  | "Purpose"
  | "Effective Date"
  | "MNDA Term"
  | "Term of Confidentiality"
  | "Governing Law"
  | "Jurisdiction";

export function formatDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-").map(Number);
  // Build the date in UTC so the displayed day never shifts with time zone.
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function yearsText(years: string): string {
  const n = years.trim();
  if (!n) return "";
  return `${n} ${n === "1" ? "year" : "years"}`;
}

/** The text a placeholder resolves to, or "" while the field is unfilled. */
export function fieldValue(form: NdaForm, field: FieldName): string {
  switch (field) {
    case "Purpose":
      return form.purpose.trim();
    case "Effective Date":
      return formatDate(form.effectiveDate);
    case "MNDA Term":
      if (form.mndaTermType === "untilTerminated") {
        return "period ending upon termination of this MNDA in accordance with its terms";
      }
      {
        const t = yearsText(form.mndaTermYears);
        return t ? `period of ${t} from the Effective Date` : "";
      }
    case "Term of Confidentiality":
      if (form.confidentialityType === "perpetuity") return "indefinite period (in perpetuity)";
      {
        const t = yearsText(form.confidentialityYears);
        return t
          ? `period of ${t} from the Effective Date (and, in the case of trade secrets, until the Confidential Information is no longer considered a trade secret under applicable laws)`
          : "";
      }
    case "Governing Law":
      return form.governingLaw.trim();
    case "Jurisdiction":
      return form.jurisdiction.trim();
  }
}

/* ------------------------------------------------------------------ */
/* Template parsing                                                    */
/* ------------------------------------------------------------------ */

export type Run =
  | { kind: "text"; text: string; bold: boolean }
  | { kind: "field"; field: FieldName; bold: false };

export type Block =
  | { kind: "heading"; runs: Run[] }
  | { kind: "paragraph"; runs: Run[] }
  | { kind: "footer"; runs: Run[] };

const FIELD_NAMES: readonly FieldName[] = [
  "Purpose",
  "Effective Date",
  "MNDA Term",
  "Term of Confidentiality",
  "Governing Law",
  "Jurisdiction",
];

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
    push(line.slice(last, match.index));
    last = match.index + match[0].length;
    const [, fieldName, boldText, linkText] = match;
    if (fieldName !== undefined) {
      if (!(FIELD_NAMES as readonly string[]).includes(fieldName)) {
        throw new Error(`Unknown template field: "${fieldName}"`);
      }
      runs.push({ kind: "field", field: fieldName as FieldName, bold: false });
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
  const blocks: Block[] = [];
  const chunks = markdown
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((c) => c.trim())
    .filter(Boolean);

  chunks.forEach((chunk, i) => {
    if (chunk.startsWith("# ")) {
      blocks.push({ kind: "heading", runs: parseInline(chunk.slice(2)) });
    } else if (i === chunks.length - 1 && /CC BY 4\.0/.test(chunk)) {
      blocks.push({ kind: "footer", runs: parseInline(chunk) });
    } else {
      blocks.push({ kind: "paragraph", runs: parseInline(chunk) });
    }
  });
  return blocks;
}

/* ------------------------------------------------------------------ */
/* Cover page                                                          */
/* ------------------------------------------------------------------ */

export interface CoverSection {
  title: string;
  /** Lines of text; an empty value means "not yet filled in". */
  lines: string[];
}

export function buildCoverSections(form: NdaForm): CoverSection[] {
  const mndaTerm =
    form.mndaTermType === "expires"
      ? yearsText(form.mndaTermYears)
        ? `Expires ${yearsText(form.mndaTermYears)} from Effective Date.`
        : ""
      : "Continues until terminated in accordance with the terms of the MNDA.";

  const confidentiality =
    form.confidentialityType === "perpetuity"
      ? "In perpetuity."
      : yearsText(form.confidentialityYears)
        ? `${yearsText(form.confidentialityYears)} from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.`
        : "";

  return [
    { title: "Purpose", lines: [form.purpose.trim()] },
    { title: "Effective Date", lines: [formatDate(form.effectiveDate)] },
    { title: "MNDA Term", lines: [mndaTerm] },
    { title: "Term of Confidentiality", lines: [confidentiality] },
    {
      title: "Governing Law & Jurisdiction",
      lines: [
        form.governingLaw.trim() && `Governing Law: ${form.governingLaw.trim()}`,
        form.jurisdiction.trim() && `Jurisdiction: ${form.jurisdiction.trim()}`,
      ].filter((l): l is string => Boolean(l)),
    },
    {
      title: "MNDA Modifications",
      lines: [form.modifications.trim() || "None."],
    },
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

/** Suggested file name for the downloaded PDF. */
export function pdfFileName(form: NdaForm): string {
  const names = [form.party1.company, form.party2.company]
    .map((n) => n.trim().replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, ""))
    .filter(Boolean);
  return names.length === 2
    ? `Mutual-NDA-${names[0]}-${names[1]}.pdf`
    : "Mutual-NDA.pdf";
}
