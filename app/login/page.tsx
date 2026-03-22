import Link from "next/link";

import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/40">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-200">
          Login
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Welcome back to Savr
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          Log in with email and password using Supabase Auth.
        </p>

        <AuthForm mode="login" />

        <p className="mt-6 text-sm text-slate-400">
          New to Savr?{" "}
          <Link href="/signup" className="font-medium text-emerald-200">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}
