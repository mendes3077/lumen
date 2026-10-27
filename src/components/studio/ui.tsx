import type { ReactNode } from "react";

export function PanelHeader({
  kicker,
  title,
  text,
}: {
  kicker: string;
  title: string;
  text: string;
}) {
  return (
    <header className="mb-6 max-w-2xl">
      <p className="text-xs font-medium tracking-widest text-accent uppercase">{kicker}</p>
      <h1 className="mt-2 font-display text-3xl text-balance text-fg md:text-4xl">{title}</h1>
      <p className="mt-3 text-pretty text-muted">{text}</p>
    </header>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="font-medium text-fg">{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line bg-raised px-3 py-3 text-fg outline-none placeholder:text-muted";

export const btnPrimary =
  "inline-flex h-11 items-center justify-center rounded-xl bg-accent px-4 text-sm font-medium text-accent-ink transition-opacity disabled:opacity-50";

export const btnGhost =
  "inline-flex h-11 items-center justify-center rounded-xl border border-line bg-surface px-4 text-sm font-medium text-fg transition-colors disabled:opacity-50";

export function Status({ error, note }: { error?: string; note?: string }) {
  if (error) {
    return (
      <p className="rounded-xl border border-line bg-raised px-4 py-3 text-sm text-pretty text-fg" role="alert">
        {error}
      </p>
    );
  }
  if (note) return <p className="text-sm text-muted">{note}</p>;
  return null;
}
