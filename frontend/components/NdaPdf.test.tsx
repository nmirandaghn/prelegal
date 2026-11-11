import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";
import { NdaPdf } from "./NdaPdf";
import { createEmptyForm, parseStandardTerms } from "@/lib/nda";

describe("NdaPdf", () => {
  it("renders a non-empty PDF from the real template", async () => {
    const terms = parseStandardTerms(
      readFileSync(path.join(__dirname, "..", "..", "templates", "Mutual-NDA.md"), "utf8"),
    );
    const form = createEmptyForm();
    form.governingLaw = "Delaware";
    form.party1.company = "Acme";
    const buffer = await renderToBuffer(<NdaPdf terms={terms} form={form} />);
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(5_000);
  });
});
