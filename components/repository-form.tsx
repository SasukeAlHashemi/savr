"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";

import { CONTENT_TYPES, type ContentType } from "@/lib/repositories";

export type RepositoryFormValues = {
  name: string;
  description: string;
  allowedTypes: ContentType[];
};

type RepositoryFormProps = {
  eyebrow: string;
  title: string;
  description: string;
  submitLabel: string;
  submitPendingLabel: string;
  backHref: string;
  backLabel: string;
  isSubmitting: boolean;
  errorMessage: string;
  initialValues?: RepositoryFormValues;
  onSubmit: (values: RepositoryFormValues) => Promise<void>;
};

export function RepositoryForm({
  eyebrow,
  title,
  description,
  submitLabel,
  submitPendingLabel,
  backHref,
  backLabel,
  isSubmitting,
  errorMessage,
  initialValues,
  onSubmit,
}: RepositoryFormProps) {
  const [repositoryName, setRepositoryName] = useState(initialValues?.name ?? "");
  const [repositoryDescription, setRepositoryDescription] = useState(
    initialValues?.description ?? "",
  );
  const [selectedTypes, setSelectedTypes] = useState<ContentType[]>(
    initialValues?.allowedTypes ?? [],
  );
  const [localErrorMessage, setLocalErrorMessage] = useState("");

  function toggleType(type: ContentType) {
    setLocalErrorMessage("");

    setSelectedTypes((currentTypes) => {
      if (currentTypes.includes(type)) {
        return currentTypes.filter((currentType) => currentType !== type);
      }

      if (currentTypes.length >= 3) {
        setLocalErrorMessage("Free repositories can only include up to 3 content types.");
        return currentTypes;
      }

      return [...currentTypes, type];
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalErrorMessage("");

    const trimmedName = repositoryName.trim();
    const trimmedDescription = repositoryDescription.trim();

    if (!trimmedName) {
      setLocalErrorMessage("Please enter a repository name.");
      return;
    }

    if (selectedTypes.length === 0) {
      setLocalErrorMessage("Please choose at least one content type.");
      return;
    }

    if (selectedTypes.length > 3) {
      setLocalErrorMessage("Free repositories can only include up to 3 content types.");
      return;
    }

    await onSubmit({
      name: trimmedName,
      description: trimmedDescription,
      allowedTypes: selectedTypes,
    });
  }

  const activeErrorMessage = localErrorMessage || errorMessage;

  return (
    <section className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/40">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-200">
            {eyebrow}
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            {description}
          </p>
        </div>

        <Link
          href={backHref}
          className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          {backLabel}
        </Link>
      </div>

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-100">
              Repository name
            </span>
            <input
              type="text"
              value={repositoryName}
              onChange={(event) => setRepositoryName(event.target.value)}
              placeholder="Example: Social saves"
              className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300"
              required
            />
          </label>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-100">
              Description
            </span>
            <textarea
              value={repositoryDescription}
              onChange={(event) => setRepositoryDescription(event.target.value)}
              placeholder="Optional: describe what this repository is for."
              rows={4}
              className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300"
            />
          </label>
          <p className="mt-2 text-xs text-slate-400">
            Optional. Use this to describe what kind of links or files belong
            here.
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-slate-100">
              Allowed content types
            </p>
            <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-200">
              {selectedTypes.length}/3 selected
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {CONTENT_TYPES.map((type) => {
              const isSelected = selectedTypes.includes(type);

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    isSelected
                      ? "border border-emerald-300 bg-emerald-300/15 text-emerald-100"
                      : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </section>

        {activeErrorMessage ? (
          <p className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            {activeErrorMessage}
          </p>
        ) : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-emerald-200"
          >
            {isSubmitting ? submitPendingLabel : submitLabel}
          </button>
        </div>
      </form>
    </section>
  );
}
