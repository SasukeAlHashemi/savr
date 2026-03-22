const contentTypes = [
  "Hyperlink",
  "JPG",
  "PNG",
  "PDF",
  "DOCX",
  "PPTX",
  "XLSX",
  "MP3",
  "MP4",
];

export default function NewRepositoryPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <section className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/40">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-200">
          New Repository
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Create a repository for a specific kind of content.
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          This page will later save repository data to Supabase. For now, it
          shows the exact fields we&apos;ll build next.
        </p>

        <div className="mt-8 space-y-6">
          <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <p className="text-sm font-medium text-slate-100">Repository name</p>
            <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
              Example: Social saves
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-slate-100">
                Allowed content types
              </p>
              <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-200">
                Max 3 for free
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {contentTypes.map((type) => (
                <span
                  key={type}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200"
                >
                  {type}
                </span>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
