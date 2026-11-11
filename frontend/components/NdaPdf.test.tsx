import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
// The legacy build is the one that runs under Node.
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { beforeAll, describe, expect, it } from "vitest";
import { NdaPdf, registerPdfFonts } from "./NdaPdf";
import { createEmptyForm, parseStandardTerms, type NdaForm } from "@/lib/nda";

const repoRoot = path.join(__dirname, "..", "..");
const terms = parseStandardTerms(
  readFileSync(path.join(repoRoot, "templates", "Mutual-NDA.md"), "utf8"),
);

beforeAll(() => registerPdfFonts(path.join(__dirname, "..", "public", "fonts")));

/** Render the PDF and return the text of each page. */
async function renderPages(form: NdaForm): Promise<string[]> {
  const buffer = await renderToBuffer(<NdaPdf terms={terms} form={form} />);
  const doc = await getDocument({ data: new Uint8Array(buffer) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    pages.push(
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " "),
    );
  }
  return pages;
}

function filledForm(): NdaForm {
  const form = createEmptyForm();
  form.effectiveDate = "2026-11-10";
  form.governingLaw = "Delaware";
  form.jurisdiction = "New Castle, DE";
  form.modifications = "Section 5 is amended.";
  form.party1 = { name: "Jane Roe", title: "CEO", company: "Acme, Inc.", noticeAddress: "jane@acme.example", date: "2026-11-10" };
  form.party2 = { name: "John Doe", title: "CTO", company: "Globex Corp", noticeAddress: "1 Main St", date: "" };
  return form;
}

describe("NdaPdf", () => {
  it("contains the cover page values and the filled-in clauses", async () => {
    const [cover, ...rest] = await renderPages(filledForm());
    const body = rest.join(" ");

    expect(cover).toContain("Mutual Non-Disclosure Agreement");
    expect(cover).toContain("November 10, 2026");
    expect(cover).toContain("Expires 1 year from Effective Date.");
    expect(cover).toContain("Governing Law: Delaware");
    expect(cover).toContain("Jurisdiction: New Castle, DE");
    expect(cover).toContain("Section 5 is amended.");
    for (const text of ["Jane Roe", "John Doe", "Acme, Inc.", "Globex Corp", "jane@acme.example"]) {
      expect(cover).toContain(text);
    }

    expect(body).toContain("Standard Terms");
    expect(body).toContain("commences on November 10, 2026 and expires");
    expect(body).toContain("laws of the State of Delaware");
    expect(body).toContain("courts located in New Castle, DE");
  });

  it("shows placeholders for unfilled fields", async () => {
    const pages = (await renderPages(createEmptyForm())).join(" ");
    expect(pages).toContain("[Effective Date]");
    expect(pages).toContain("[Governing Law & Jurisdiction]");
  });

  it("keeps Latin Extended and Cyrillic text from the form", async () => {
    const form = filledForm();
    form.party1.company = "Łódź Sp. z o.o.";
    form.party2.company = "Москва ООО";
    const [cover] = await renderPages(form);
    expect(cover).toContain("Łódź Sp. z o.o.");
    expect(cover).toContain("Москва ООО");
  });

  it("flows a very long modifications text onto further pages instead of clipping it", async () => {
    const form = filledForm();
    form.modifications = Array.from({ length: 120 }, (_, i) => `Modification ${i + 1} applies.`).join(" ");
    const pages = (await renderPages(form)).join(" ");
    expect(pages).toContain("Modification 1 applies.");
    expect(pages).toContain("Modification 120 applies.");
  });
});
