"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  RepositoryForm,
  type RepositoryFormValues,
} from "@/components/repository-form";
import { createClient } from "@/lib/supabase/client";
import type { Repository } from "@/lib/repositories";

export default function EditRepositoryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const repositoryId = Number(params.id);

  const [repository, setRepository] = useState<Repository | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadRepository() {
      if (!Number.isFinite(repositoryId)) {
        setErrorMessage("This repository ID is invalid.");
        setIsLoadingPage(false);
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!isActive) {
        return;
      }

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("repositories")
        .select("id, name, description, allowed_types, created_at")
        .eq("id", repositoryId)
        .single();

      if (!isActive) {
        return;
      }

      if (error || !data) {
        setErrorMessage("We could not find that repository.");
        setIsLoadingPage(false);
        return;
      }

      setRepository(data as Repository);
      setErrorMessage("");
      setIsLoadingPage(false);
    }

    void loadRepository();

    return () => {
      isActive = false;
    };
  }, [repositoryId, router]);

  async function handleSubmit(values: RepositoryFormValues) {
    if (!repository) {
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("repositories")
        .update({
          name: values.name,
          description: values.description || null,
          allowed_types: values.allowedTypes,
        })
        .eq("id", repository.id);

      if (error) {
        throw error;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not update the repository. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingPage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
        <p className="text-sm text-slate-300">Loading repository details...</p>
      </main>
    );
  }

  if (!repository) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
        <div className="max-w-md rounded-3xl border border-rose-400/30 bg-rose-400/10 p-6 text-center">
          <p className="text-sm text-rose-200">{errorMessage}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <RepositoryForm
        eyebrow="Edit Repository"
        title={`Update ${repository.name}`}
        description="Change the repository name, add or update an optional description, and adjust its allowed content types."
        submitLabel="Save changes"
        submitPendingLabel="Saving changes..."
        backHref="/dashboard"
        backLabel="Back to dashboard"
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
        initialValues={{
          name: repository.name,
          description: repository.description ?? "",
          allowedTypes: repository.allowed_types,
        }}
        onSubmit={handleSubmit}
      />
    </main>
  );
}
