"use client";

import { useState } from "react";
import { NdaForm } from "@/components/NdaForm";
import { NdaPreview } from "@/components/NdaPreview";
import {
  createEmptyForm,
  pdfFileName,
  type Block,
  type NdaForm as NdaFormValues,
} from "@/lib/nda";

export function NdaCreator({ terms }: { terms: Block[] }) {
  const [form, setForm] = useState<NdaFormValues>(createEmptyForm);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    try {
      // Loaded on demand: the PDF engine is large and only needed here.
      const [{ pdf }, { NdaPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/NdaPdf"),
      ]);
      const blob = await pdf(<NdaPdf terms={terms} form={form} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = pdfFileName(form);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      setError("Sorry, the PDF could not be generated. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-100">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">Prelegal</h1>
            <p className="text-sm text-zinc-600">Mutual NDA creator</p>
          </div>
          <div className="flex items-center gap-3">
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
            >
              {downloading ? "Preparing PDF…" : "Download PDF"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
          <NdaForm form={form} onChange={setForm} />
        </div>
        <NdaPreview terms={terms} form={form} />
      </main>
    </div>
  );
}
