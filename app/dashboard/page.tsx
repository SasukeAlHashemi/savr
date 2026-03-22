const repositoryCards = [
  {
    name: "Creator Vault",
    description: "YouTube links, thumbnails, and saved uploads.",
    itemCount: 12,
  },
  {
    name: "Research Saves",
    description: "Articles, PDFs, and image references.",
    itemCount: 8,
  },
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <section className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-200">
              Dashboard
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">
              Your repositories will live here.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              This page will later show the logged-in user&apos;s repositories
              from the database.
            </p>
          </div>

          <a
            href="/repositories/new"
            className="inline-flex rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
          >
            New repository
          </a>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {repositoryCards.map((repository) => (
            <article
              key={repository.name}
              className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-slate-950/30"
            >
              <p className="text-sm font-medium text-emerald-200">
                {repository.itemCount} items
              </p>
              <h2 className="mt-3 text-2xl font-semibold">{repository.name}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                {repository.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
