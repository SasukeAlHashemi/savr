import Link from "next/link";

import { AuthForm } from "@/components/auth-form";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/40">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-200">
          Sign Up
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Create your Savr account
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          Create a Savr account with email and password using Supabase Auth.
        </p>

        <AuthForm mode="signup" />

        <p className="mt-6 text-sm text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-emerald-200">
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}
