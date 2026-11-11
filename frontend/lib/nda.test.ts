import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  blockingErrors,
  buildCoverSections,
  createEmptyForm,
  fieldValue,
  formatDate,
  missingFields,
  parseInline,
  parseStandardTerms,
  parseYears,
  pdfFileName,
  resolveRuns,
  unsupportedPdfCharacters,
  type NdaForm,
} from "./nda";

const templatePath = path.join(__dirname, "..", "..", "templates", "Mutual-NDA.md");
const blocks = parseStandardTerms(readFileSync(templatePath, "utf8"));

function filledForm(): NdaForm {
  const form = createEmptyForm();
  form.effectiveDate = "2026-11-10";
  form.governingLaw = "Delaware";
  form.jurisdiction = "New Castle, DE";
  form.party1 = { name: "Jane Roe", title: "CEO", company: "Acme, Inc.", noticeAddress: "jane@acme.example", date: "" };
  form.party2 = { name: "John Doe", title: "CTO", company: "Globex Corp", noticeAddress: "1 Main St", date: "" };
  return form;
}

/** The rendered text of the nth clause (1-based) of the standard terms. */
function clause(n: number, form: NdaForm): string {
  const paragraphs = blocks.filter((b) => b.kind === "paragraph");
  return resolveRuns(paragraphs[n - 1].runs, form)
    .map((s) => s.text)
    .join("");
}

describe("parseInline", () => {
  it("splits text, bold and coverpage fields", () => {
    expect(
      parseInline(
        'Use for the <span class="coverpage_link">Purpose</span> and **Disclosing Party**.',
      ),
    ).toEqual([
      { kind: "text", text: "Use for the ", bold: false },
      { kind: "field", field: "Purpose" },
      { kind: "text", text: " and ", bold: false },
      { kind: "text", text: "Disclosing Party", bold: true },
      { kind: "text", text: ".", bold: false },
    ]);
  });

  it("drops the article before Effective Date only", () => {
    expect(parseInline('on the <span class="coverpage_link">Effective Date</span>')).toEqual([
      { kind: "text", text: "on ", bold: false },
      { kind: "field", field: "Effective Date" },
    ]);
  });

  it("keeps link text and drops the url", () => {
    expect(parseInline("see [CC BY 4.0](https://example.com)")).toEqual([
      { kind: "text", text: "see ", bold: false },
      { kind: "text", text: "CC BY 4.0", bold: false },
    ]);
  });

  it("rejects unknown fields so template changes fail loudly", () => {
    expect(() => parseInline('<span class="coverpage_link">Nope</span>')).toThrow(
      /Unknown template field/,
    );
  });
});

describe("real Mutual-NDA.md template", () => {
  it("parses a heading, 11 clauses and a footer", () => {
    expect(blocks[0].kind).toBe("heading");
    expect(blocks.filter((b) => b.kind === "paragraph")).toHaveLength(11);
    expect(blocks.at(-1)?.kind).toBe("footer");
  });

  it("references every cover page field", () => {
    const fields = new Set(
      blocks.flatMap((b) => b.runs.flatMap((r) => (r.kind === "field" ? [r.field] : []))),
    );
    expect([...fields].sort()).toEqual(
      [
        "Effective Date",
        "Governing Law",
        "Jurisdiction",
        "MNDA Term",
        "Purpose",
        "Term of Confidentiality",
      ].sort(),
    );
  });
});

describe("clause wording once the form is filled in", () => {
  const form = filledForm();

  it("keeps the long terms as defined terms that point to the cover page", () => {
    expect(clause(1, form)).toContain("in connection with the Purpose which (1)");
    expect(clause(2, form)).toContain("solely for the Purpose; (b)");
    expect(clause(5, form)).toContain("expires at the end of the MNDA Term.");
    expect(clause(5, form)).toContain("will survive for the Term of Confidentiality,");
  });

  it("writes the effective date without a stray article", () => {
    expect(clause(5, form)).toContain("This MNDA commences on November 10, 2026 and expires");
  });

  it("writes governing law and jurisdiction into clause 9", () => {
    expect(clause(9, form)).toContain("the laws of the State of Delaware, without regard");
    expect(clause(9, form)).toContain("courts located in New Castle, DE.");
  });

  it("does not double 'State of' when the user types it", () => {
    for (const typed of ["State of Delaware", "the State of Delaware", "  state of  Delaware "]) {
      const text = clause(9, { ...form, governingLaw: typed });
      expect(text).toContain("the laws of the State of Delaware,");
      expect(text).not.toContain("State of State");
    }
  });

  it("shows placeholders for unfilled inline fields", () => {
    const empty = createEmptyForm();
    expect(clause(5, empty)).toContain("commences on [Effective Date] and expires");
    expect(clause(9, empty)).toContain("State of [Governing Law]");
    const styles = resolveRuns(blocks[1].kind === "paragraph" ? blocks[1].runs : [], empty);
    expect(styles.some((s) => s.style === "term" && s.text === "Purpose")).toBe(true);
  });
});

describe("parseYears", () => {
  it.each([
    ["1", 1],
    [" 3 ", 3],
    ["999", 999],
  ])("accepts %j", (input, expected) => {
    expect(parseYears(input)).toBe(expected);
  });

  it.each(["", "0", "-3", "1.5", "1e3", "01", "1.0", "abc", "1000", "+2"])("rejects %j", (input) => {
    expect(parseYears(input)).toBeNull();
  });
});

describe("buildCoverSections", () => {
  const find = (form: NdaForm, title: string) =>
    buildCoverSections(form).find((s) => s.title === title)!;

  it("describes the terms with singular and plural years", () => {
    const form = filledForm();
    expect(find(form, "MNDA Term").lines).toEqual(["Expires 1 year from Effective Date."]);
    expect(find({ ...form, mndaTermYears: "3" }, "MNDA Term").lines).toEqual([
      "Expires 3 years from Effective Date.",
    ]);
    expect(find({ ...form, confidentialityYears: "2" }, "Term of Confidentiality").lines[0]).toMatch(
      /^2 years from Effective Date, but in the case of trade secrets/,
    );
  });

  it("handles the open-ended and perpetual options", () => {
    const form: NdaForm = {
      ...filledForm(),
      mndaTermType: "untilTerminated",
      confidentialityType: "perpetuity",
    };
    expect(find(form, "MNDA Term").lines).toEqual([
      "Continues until terminated in accordance with the terms of the MNDA.",
    ]);
    expect(find(form, "Term of Confidentiality").lines).toEqual(["In perpetuity."]);
  });

  it("treats invalid years as unfilled", () => {
    const section = find({ ...filledForm(), mndaTermYears: "0" }, "MNDA Term");
    expect(section).toEqual({ title: "MNDA Term", lines: ["[MNDA Term]"], placeholder: true });
  });

  it("fills governing law & jurisdiction and defaults modifications to None", () => {
    const form = filledForm();
    expect(find(form, "Governing Law & Jurisdiction").lines).toEqual([
      "Governing Law: Delaware",
      "Jurisdiction: New Castle, DE",
    ]);
    expect(find(form, "MNDA Modifications").lines).toEqual(["None."]);
    expect(find(createEmptyForm(), "Governing Law & Jurisdiction").placeholder).toBe(true);
  });
});

describe("formatDate", () => {
  it("formats ISO dates without time zone shifts", () => {
    expect(formatDate("2026-11-10")).toBe("November 10, 2026");
  });

  it("returns empty for blank, malformed or impossible dates", () => {
    expect(formatDate("")).toBe("");
    expect(formatDate("10/11/2026")).toBe("");
    expect(formatDate("2026-02-31")).toBe("");
  });

  it("does not turn a partly typed year into the 1900s", () => {
    expect(formatDate("0002-11-10")).not.toContain("1902");
  });
});

describe("fieldValue", () => {
  it("is empty until the field is filled in", () => {
    const form = createEmptyForm();
    expect(fieldValue(form, "Effective Date")).toBe("");
    expect(fieldValue(form, "Governing Law")).toBe("");
    expect(fieldValue(form, "Jurisdiction")).toBe("");
  });
});

describe("blockingErrors", () => {
  it("passes a valid form", () => {
    expect(blockingErrors(filledForm())).toEqual([]);
  });

  it("flags invalid years only for the selected options", () => {
    const form = { ...filledForm(), mndaTermYears: "0", confidentialityYears: "-1" };
    expect(blockingErrors(form)).toHaveLength(2);
    expect(
      blockingErrors({ ...form, mndaTermType: "untilTerminated", confidentialityType: "perpetuity" }),
    ).toEqual([]);
  });

  it("flags characters the PDF font cannot display", () => {
    const form = { ...filledForm(), party1: { ...filledForm().party1, company: "株式会社" } };
    expect(blockingErrors(form)[0]).toContain("株");
  });
});

describe("unsupportedPdfCharacters", () => {
  it("accepts Latin, Latin Extended, Cyrillic, Greek and typographic punctuation", () => {
    const form = filledForm();
    form.party1.company = "Łódź Sp. z o.o. – Şirket “Ğ” Москва Αθήνα";
    expect(unsupportedPdfCharacters(form)).toEqual([]);
  });

  it("reports CJK, Arabic and emoji once each", () => {
    const form = filledForm();
    form.modifications = "株株 مرحبا 🙂";
    const bad = unsupportedPdfCharacters(form);
    expect(bad).toContain("株");
    expect(bad).toContain("🙂");
    expect(new Set(bad).size).toBe(bad.length);
  });
});

describe("missingFields", () => {
  it("lists everything unfilled on an empty form", () => {
    expect(missingFields(createEmptyForm())).toEqual([
      "Effective date",
      "Governing law",
      "Jurisdiction",
      "Party 1 name",
      "Party 1 company",
      "Party 1 notice address",
      "Party 2 name",
      "Party 2 company",
      "Party 2 notice address",
    ]);
  });

  it("is empty for a complete form", () => {
    expect(missingFields(filledForm())).toEqual([]);
  });
});

describe("pdfFileName", () => {
  it("uses sanitised company names when both are present", () => {
    expect(pdfFileName(filledForm())).toBe("Mutual-NDA-Acme-Inc-Globex-Corp.pdf");
  });

  it("falls back to a generic name", () => {
    expect(pdfFileName(createEmptyForm())).toBe("Mutual-NDA.pdf");
  });
});
