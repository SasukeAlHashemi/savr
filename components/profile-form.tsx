"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  ALLOWED_AVATAR_EXTENSIONS,
  normalizeUsername,
  validateUsername,
} from "@/lib/profiles";

export type ProfileFormValues = {
  username: string;
  avatarFile: File | null;
};

type ProfileFormProps = {
  isSubmitting: boolean;
  errorMessage: string;
  initialUsername?: string;
  onSubmit: (values: ProfileFormValues) => Promise<void>;
};

export function ProfileForm({
  isSubmitting,
  errorMessage,
  initialUsername = "",
  onSubmit,
}: ProfileFormProps) {
  const [username, setUsername] = useState(initialUsername);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [localErrorMessage, setLocalErrorMessage] = useState("");

  const avatarPreviewUrl = useMemo(() => {
    if (!avatarFile) {
      return "";
    }

    return URL.createObjectURL(avatarFile);
  }, [avatarFile]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    setLocalErrorMessage("");
    setAvatarFile(event.target.files?.[0] ?? null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalErrorMessage("");

    const normalizedUsername = normalizeUsername(username);
    const usernameValidationMessage = validateUsername(normalizedUsername);

    if (usernameValidationMessage) {
      setLocalErrorMessage(usernameValidationMessage);
      return;
    }

    await onSubmit({
      username: normalizedUsername,
      avatarFile,
    });
  }

  const activeErrorMessage = localErrorMessage || errorMessage;

  return (
    <section className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/40">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-200">
            Profile Setup
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            Set up your Savr identity
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            Choose a unique username and optionally upload a profile image.
            Other users will later use this profile to find your repositories.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          Back to dashboard
        </Link>
      </div>

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-100">
              Username
            </span>
            <input
              type="text"
              value={username}
              onChange={(event) => {
                setLocalErrorMessage("");
                setUsername(event.target.value);
              }}
              placeholder="example.user"
              className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300"
              required
            />
          </label>
          <p className="mt-2 text-xs leading-6 text-slate-400">
            Use 3 to 20 lowercase characters. Allowed: letters, numbers,
            periods, and underscores.
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <div className="grid gap-5 md:grid-cols-[0.8fr_1.2fr]">
            <div className="flex items-center justify-center rounded-3xl border border-dashed border-white/10 bg-slate-950/50 p-6">
              {avatarPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreviewUrl}
                  alt="Selected avatar preview"
                  className="h-32 w-32 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-white/10 text-3xl font-semibold text-white">
                  {normalizeUsername(username).slice(0, 1) || "?"}
                </div>
              )}
            </div>

            <div>
              <label className="block">
                <span className="text-sm font-medium text-slate-100">
                  Profile image
                </span>
                <input
                  type="file"
                  accept={ALLOWED_AVATAR_EXTENSIONS.join(",") + ",image/jpeg,image/png,image/webp"}
                  onChange={handleAvatarChange}
                  className="mt-3 block w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 file:mr-4 file:rounded-full file:border-0 file:bg-emerald-400 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-950"
                />
              </label>
              <p className="mt-3 text-xs leading-6 text-slate-400">
                Optional. Use JPG, PNG, or WEBP. You can add or change this
                later too.
              </p>
            </div>
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
            {isSubmitting ? "Saving profile..." : "Save profile"}
          </button>
        </div>
      </form>
    </section>
  );
}
