"use client";

import type { ReactNode } from "react";
import { parseYears, type NdaForm as NdaFormValues, type PartyDetails } from "@/lib/nda";

interface Props {
  form: NdaFormValues;
  onChange: (next: NdaFormValues) => void;
}

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 disabled:bg-zinc-100 disabled:text-zinc-400";

function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-zinc-800">
        {label}
      </label>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
      <legend className="px-1 text-sm font-semibold text-zinc-900">{title}</legend>
      {children}
    </fieldset>
  );
}

function TermGroup({
  name,
  legend,
  hint,
  mode,
  yearsMode,
  yearsLabel,
  otherMode,
  otherLabel,
  years,
  onModeChange,
  onYearsChange,
}: {
  name: string;
  legend: string;
  hint: string;
  mode: string;
  yearsMode: string;
  yearsLabel: string;
  otherMode: string;
  otherLabel: string;
  years: string;
  onModeChange: (mode: string) => void;
  onYearsChange: (years: string) => void;
}) {
  const usingYears = mode === yearsMode;
  const invalid = usingYears && parseYears(years) === null;
  const hintId = `${name}-hint`;
  const errorId = `${name}-error`;
  return (
    <fieldset className="space-y-2" aria-describedby={hintId}>
      <legend className="text-sm font-medium text-zinc-800">{legend}</legend>
      <p id={hintId} className="text-xs text-zinc-500">
        {hint}
      </p>
      <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-800">
        <input
          id={`${name}-${yearsMode}`}
          type="radio"
          name={name}
          checked={usingYears}
          onChange={() => onModeChange(yearsMode)}
          className="h-4 w-4 accent-indigo-600"
        />
        <label htmlFor={`${name}-${yearsMode}`}>{yearsLabel}</label>
        <input
          type="number"
          min={1}
          max={999}
          step={1}
          value={years}
          disabled={!usingYears}
          onChange={(e) => onYearsChange(e.target.value)}
          aria-label={`${legend}: number of years`}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          className={`${inputClass} !w-20`}
        />
        <span className="text-zinc-600">year(s) from Effective Date</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-zinc-800">
        <input
          id={`${name}-${otherMode}`}
          type="radio"
          name={name}
          checked={!usingYears}
          onChange={() => onModeChange(otherMode)}
          className="h-4 w-4 accent-indigo-600"
        />
        <label htmlFor={`${name}-${otherMode}`}>{otherLabel}</label>
      </div>
      {invalid && (
        <p id={errorId} className="text-xs text-red-700">
          Enter a whole number of years from 1 to 999.
        </p>
      )}
    </fieldset>
  );
}

function PartyFields({
  title,
  prefix,
  party,
  onChange,
}: {
  title: string;
  prefix: string;
  party: PartyDetails;
  onChange: (next: PartyDetails) => void;
}) {
  const set = (key: keyof PartyDetails) => (value: string) =>
    onChange({ ...party, [key]: value });
  return (
    <Section title={title}>
      <Field label="Print name" htmlFor={`${prefix}-name`}>
        <input
          id={`${prefix}-name`}
          className={inputClass}
          value={party.name}
          onChange={(e) => set("name")(e.target.value)}
        />
      </Field>
      <Field label="Title" htmlFor={`${prefix}-title`}>
        <input
          id={`${prefix}-title`}
          className={inputClass}
          value={party.title}
          onChange={(e) => set("title")(e.target.value)}
        />
      </Field>
      <Field label="Company" htmlFor={`${prefix}-company`}>
        <input
          id={`${prefix}-company`}
          className={inputClass}
          value={party.company}
          onChange={(e) => set("company")(e.target.value)}
        />
      </Field>
      <Field
        label="Notice address"
        hint="Email or postal address for notices."
        htmlFor={`${prefix}-address`}
      >
        <input
          id={`${prefix}-address`}
          className={inputClass}
          value={party.noticeAddress}
          onChange={(e) => set("noticeAddress")(e.target.value)}
        />
      </Field>
      <Field label="Signing date" htmlFor={`${prefix}-date`}>
        <input
          id={`${prefix}-date`}
          type="date"
          className={inputClass}
          value={party.date}
          onChange={(e) => set("date")(e.target.value)}
        />
      </Field>
    </Section>
  );
}

export function NdaForm({ form, onChange }: Props) {
  const set = <K extends keyof NdaFormValues>(key: K, value: NdaFormValues[K]) =>
    onChange({ ...form, [key]: value });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => e.preventDefault()}
      aria-label="Mutual NDA details"
    >
      <Section title="Agreement terms">
        <Field
          label="Purpose"
          hint="How Confidential Information may be used."
          htmlFor="purpose"
        >
          <textarea
            id="purpose"
            rows={3}
            className={inputClass}
            value={form.purpose}
            onChange={(e) => set("purpose", e.target.value)}
          />
        </Field>
        <Field label="Effective date" htmlFor="effective-date">
          <div className="flex items-center gap-2">
            <input
              id="effective-date"
              type="date"
              className={inputClass}
              value={form.effectiveDate}
              onChange={(e) => set("effectiveDate", e.target.value)}
            />
            <button
              type="button"
              onClick={() => set("effectiveDate", todayIso())}
              className="shrink-0 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Today
            </button>
          </div>
        </Field>

        <TermGroup
          name="mnda-term"
          legend="MNDA term"
          hint="The length of this MNDA."
          mode={form.mndaTermType}
          yearsMode="expires"
          yearsLabel="Expires"
          otherMode="untilTerminated"
          otherLabel="Continues until terminated"
          years={form.mndaTermYears}
          onModeChange={(m) => set("mndaTermType", m as NdaFormValues["mndaTermType"])}
          onYearsChange={(v) => set("mndaTermYears", v)}
        />

        <TermGroup
          name="confidentiality"
          legend="Term of confidentiality"
          hint="How long Confidential Information is protected."
          mode={form.confidentialityType}
          yearsMode="years"
          yearsLabel="For"
          otherMode="perpetuity"
          otherLabel="In perpetuity"
          years={form.confidentialityYears}
          onModeChange={(m) => set("confidentialityType", m as NdaFormValues["confidentialityType"])}
          onYearsChange={(v) => set("confidentialityYears", v)}
        />
      </Section>

      <Section title="Governing law & jurisdiction">
        <Field label="Governing law" hint="State, e.g. Delaware." htmlFor="governing-law">
          <input
            id="governing-law"
            className={inputClass}
            value={form.governingLaw}
            onChange={(e) => set("governingLaw", e.target.value)}
          />
        </Field>
        <Field
          label="Jurisdiction"
          hint="City or county and state, e.g. New Castle, DE."
          htmlFor="jurisdiction"
        >
          <input
            id="jurisdiction"
            className={inputClass}
            value={form.jurisdiction}
            onChange={(e) => set("jurisdiction", e.target.value)}
          />
        </Field>
      </Section>

      <Section title="Modifications">
        <Field
          label="MNDA modifications"
          hint="Optional. Changes to the Standard Terms; these control over conflicts."
          htmlFor="modifications"
        >
          <textarea
            id="modifications"
            rows={3}
            className={inputClass}
            value={form.modifications}
            onChange={(e) => set("modifications", e.target.value)}
          />
        </Field>
      </Section>

      <PartyFields
        title="Party 1"
        prefix="party1"
        party={form.party1}
        onChange={(p) => set("party1", p)}
      />
      <PartyFields
        title="Party 2"
        prefix="party2"
        party={form.party2}
        onChange={(p) => set("party2", p)}
      />
    </form>
  );
}
