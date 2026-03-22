import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
      <section className="w-full max-w-4xl rounded-3xl border border-white/10 bg-white/5 p-10 shadow-2xl shadow-slate-950/40 backdrop-blur">
        <div className="mb-10 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200">
          Savr MVP
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
              Save, preview, and share the content that matters to you.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">
              Savr helps users organize links, videos, images, documents, and
              uploads inside repositories built for quick access and clean
              sharing.
            </p>

            <div className="flex flex-wrap gap-3 text-sm text-slate-200">
              <span className="rounded-full bg-white/10 px-4 py-2">
                Link previews
              </span>
              <span className="rounded-full bg-white/10 px-4 py-2">
                File uploads
              </span>
              <span className="rounded-full bg-white/10 px-4 py-2">
                Shareable pages
              </span>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/login"
                className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Sign up
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
              First build targets
            </p>
            <ul className="mt-5 space-y-4 text-sm text-slate-200">
              <li>1. User signup and login</li>
              <li>2. Repository creation with type limits</li>
              <li>3. Save links and upload files</li>
              <li>4. Show previews inside each repository</li>
              <li>5. Share uploaded files with public pages</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
