import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildCoverSections,
  createEmptyForm,
  fieldValue,
  formatDate,
  parseInline,
  parseStandardTerms,
  pdfFileName,
} from "./nda";

const templatePath = path.join(__dirname, "..", "..", "templates", "Mutual-NDA.md");

describe("parseInline", () => {
  it("splits text, bold and coverpage fields", () => {
    expect(
      parseInline(
        'Use for <span class="coverpage_link">Purpose</span> and **Disclosing Party**.',
      ),
    ).toEqual([
      { kind: "text", text: "Use for ", bold: false },
      { kind: "field", field: "Purpose", bold: false },
      { kind: "text", text: " and ", bold: false },
      { kind: "text", text: "Disclosing Party", bold: true },
      { kind: "text", text: ".", bold: false },
    ]);
  });

  it("keeps link text and drops the url", () => {
    expect(parseInline("see [CC BY 4.0](https://example.com)")).toEqual([
      { kind: "text", text: "see ", bold: false },
      { kind: "text", text: "CC BY 4.0", bold: false },
    ]);
  });

  it("rejects unknown fields so template changes fail loudly", () => {
    expect(() =>
      parseInline('<span class="coverpage_link">Nope</span>'),
    ).toThrow(/Unknown template field/);
  });
});

describe("real Mutual-NDA.md template", () => {
  const blocks = parseStandardTerms(readFileSync(templatePath, "utf8"));

  it("parses a heading, 11 clauses and a footer", () => {
    expect(blocks[0].kind).toBe("heading");
    expect(blocks.filter((b) => b.kind === "paragraph")).toHaveLength(11);
    expect(blocks.at(-1)?.kind).toBe("footer");
  });

  it("references every cover page field", () => {
    const fields = new Set(
      blocks.flatMap((b) =>
        b.runs.flatMap((r) => (r.kind === "field" ? [r.field] : [])),
      ),
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

describe("fieldValue", () => {
  it("is empty until the field is filled in", () => {
    const form = { ...createEmptyForm(), purpose: "", mndaTermYears: "" };
    expect(fieldValue(form, "Purpose")).toBe("");
    expect(fieldValue(form, "Governing Law")).toBe("");
    expect(fieldValue(form, "MNDA Term")).toBe("");
  });

  it("formats terms with singular and plural years", () => {
    const form = createEmptyForm();
    expect(fieldValue(form, "MNDA Term")).toBe("period of 1 year from the Effective Date");
    expect(fieldValue({ ...form, mndaTermYears: "3" }, "MNDA Term")).toBe(
      "period of 3 years from the Effective Date",
    );
  });

  it("handles open-ended and perpetual options", () => {
    const form = {
      ...createEmptyForm(),
      mndaTermType: "untilTerminated" as const,
      confidentialityType: "perpetuity" as const,
    };
    expect(fieldValue(form, "MNDA Term")).toMatch(/termination/);
    expect(fieldValue(form, "Term of Confidentiality")).toMatch(/perpetuity/);
  });
});

describe("formatDate", () => {
  it("formats ISO dates without time zone shifts", () => {
    expect(formatDate("2026-11-10")).toBe("November 10, 2026");
  });
  it("returns empty for blank or malformed input", () => {
    expect(formatDate("")).toBe("");
    expect(formatDate("10/11/2026")).toBe("");
  });
});

describe("buildCoverSections", () => {
  it("defaults modifications to None and leaves unfilled sections empty", () => {
    const sections = buildCoverSections(createEmptyForm());
    expect(sections.find((s) => s.title === "MNDA Modifications")?.lines).toEqual(["None."]);
    expect(sections.find((s) => s.title === "Governing Law & Jurisdiction")?.lines).toEqual([]);
  });
});

describe("pdfFileName", () => {
  it("uses sanitised company names when both are present", () => {
    const form = createEmptyForm();
    form.party1.company = "Acme, Inc.";
    form.party2.company = "Globex Corp";
    expect(pdfFileName(form)).toBe("Mutual-NDA-Acme-Inc-Globex-Corp.pdf");
  });
  it("falls back to a generic name", () => {
    expect(pdfFileName(createEmptyForm())).toBe("Mutual-NDA.pdf");
  });
});
