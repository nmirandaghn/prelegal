"use client";

import { useState } from "react";
import { NdaForm } from "@/components/NdaForm";
import { NdaPreview } from "@/components/NdaPreview";
import {
  blockingErrors,
  createEmptyForm,
  missingFields,
  pdfFileName,
  type Block,
  type NdaForm as NdaFormValues,
} from "@/lib/nda";

export function NdaCreator({ terms }: { terms: Block[] }) {
  const [form, setForm] = useState<NdaFormValues>(createEmptyForm);
  const [downloading, setDownloading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [missing, setMissing] = useState<string[]>([]);

  function handleChange(next: NdaFormValues) {
    setForm(next);
    // Messages describe the form as it was; drop them once the user edits it.
    setErrors([]);
    setMissing([]);
  }

  async function generatePdf() {
    setDownloading(true);
    setErrors([]);
    setMissing([]);
    try {
      // Loaded on demand: the PDF engine is large and only needed here.
      const [{ pdf }, { NdaPdf, registerPdfFonts }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/NdaPdf"),
      ]);
      registerPdfFonts("/fonts");
      const blob = await pdf(<NdaPdf terms={terms} form={form} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = pdfFileName(form);
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoking straight away can abort the download in some browsers.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      console.error(e);
      setErrors(["Sorry, the PDF could not be generated. Please try again."]);
    } finally {
      setDownloading(false);
    }
  }

  function handleDownloadClick() {
    if (downloading) return;
    const problems = blockingErrors(form);
    if (problems.length) {
      setErrors(problems);
      setMissing([]);
      return;
    }
    const empty = missingFields(form);
    if (empty.length) {
      setMissing(empty);
      return;
    }
    void generatePdf();
  }

  return (
    <div className="min-h-screen bg-zinc-100">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-sm font-semibold text-zinc-600">Prelegal</p>
            <h1 className="text-lg font-semibold text-zinc-900">Mutual NDA creator</h1>
          </div>
          <button
            type="button"
            onClick={handleDownloadClick}
            aria-disabled={downloading}
            aria-busy={downloading}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 aria-disabled:opacity-60"
          >
            {downloading ? "Preparing PDF…" : "Download PDF"}
          </button>
        </div>

        {errors.length > 0 && (
          <div role="alert" className="border-t border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <ul className="mx-auto max-w-7xl list-disc pl-5">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        {missing.length > 0 && (
          <div role="status" className="border-t border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
              <p>
                These fields are still empty and will appear as placeholders in the PDF:{" "}
                <strong>{missing.join(", ")}</strong>.
              </p>
              <button
                type="button"
                onClick={() => void generatePdf()}
                className="rounded-md border border-amber-400 bg-white px-3 py-1.5 font-medium text-amber-900 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
              >
                Download anyway
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
          <NdaForm form={form} onChange={handleChange} />
        </div>
        <NdaPreview terms={terms} form={form} />
      </main>
    </div>
  );
}
