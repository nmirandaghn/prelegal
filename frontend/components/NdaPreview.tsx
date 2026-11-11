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
  type Segment,
} from "@/lib/nda";

function SegmentText({ segment }: { segment: Segment }) {
  switch (segment.style) {
    case "bold":
    case "term":
      return <strong>{segment.text}</strong>;
    case "value":
      return (
        <span className="font-semibold underline decoration-indigo-400 underline-offset-2">
          {segment.text}
        </span>
      );
    case "placeholder":
      return (
        <span className="rounded bg-amber-100 px-1 text-amber-800 print:bg-transparent">
          {segment.text}
        </span>
      );
    case "plain":
      return <>{segment.text}</>;
  }
}

function Runs({ runs, form }: { runs: Run[]; form: NdaForm }) {
  return (
    <>
      {resolveRuns(runs, form).map((segment, i) => (
        <SegmentText key={i} segment={segment} />
      ))}
    </>
  );
}

function CoverPage({ form }: { form: NdaForm }) {
  return (
    <section aria-label="Cover page" className="space-y-5">
      <h2 className="text-2xl font-bold">Mutual Non-Disclosure Agreement</h2>
      <p className="text-sm font-bold tracking-wide uppercase">
        Using this Mutual Non-Disclosure Agreement
      </p>
      <p>{COVER_INTRO}</p>

      {buildCoverSections(form).map((section) => (
        <div key={section.title}>
          <h3 className="font-bold">{section.title}</h3>
          {section.lines.map((line, i) => (
            <p key={i}>
              <SegmentText
                segment={{ text: line, style: section.placeholder ? "placeholder" : "plain" }}
              />
            </p>
          ))}
        </div>
      ))}

      <p>{COVER_SIGNING_LINE}</p>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th scope="col" className="w-1/5 border border-zinc-400 p-2">
              <span className="sr-only">Detail</span>
            </th>
            <th scope="col" className="border border-zinc-400 p-2 text-center">
              PARTY 1
            </th>
            <th scope="col" className="border border-zinc-400 p-2 text-center">
              PARTY 2
            </th>
          </tr>
        </thead>
        <tbody>
          {PARTY_ROWS.map((row) => (
            <tr key={row.label}>
              <th scope="row" className="border border-zinc-400 p-2 text-left align-top">
                {row.label}
              </th>
              <td className="h-10 border border-zinc-400 p-2 text-center align-top">
                {row.get(form.party1)}
              </td>
              <td className="h-10 border border-zinc-400 p-2 text-center align-top">
                {row.get(form.party2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-xs text-zinc-600">{COVER_FOOTER}</p>
    </section>
  );
}

export function NdaPreview({ terms, form }: { terms: Block[]; form: NdaForm }) {
  return (
    <article
      aria-label="Mutual NDA preview"
      className="mx-auto max-w-[8.5in] space-y-8 rounded-lg bg-white p-10 text-[15px] leading-relaxed text-zinc-900 shadow-md"
    >
      <CoverPage form={form} />
      <hr className="border-zinc-300" />
      <section aria-label="Standard terms" className="space-y-4">
        {terms.map((block, i) => {
          if (block.kind === "heading") {
            return (
              <h2 key={i} className="text-xl font-bold">
                <Runs runs={block.runs} form={form} />
              </h2>
            );
          }
          return (
            <p key={i} className={block.kind === "footer" ? "text-xs text-zinc-600" : undefined}>
              <Runs runs={block.runs} form={form} />
            </p>
          );
        })}
      </section>
    </article>
  );
}
