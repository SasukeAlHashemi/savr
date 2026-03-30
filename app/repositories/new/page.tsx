"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  RepositoryForm,
  type RepositoryFormValues,
} from "@/components/repository-form";
import { createClient } from "@/lib/supabase/client";

export default function NewRepositoryPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadUser() {
      const supabase = createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!isActive) {
        return;
      }

      if (error || !user) {
        router.replace("/login");
        return;
      }

      setUserId(user.id);
      setIsLoadingPage(false);
    }

    void loadUser();

    return () => {
      isActive = false;
    };
  }, [router]);

  async function handleSubmit(values: RepositoryFormValues) {
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.from("repositories").insert({
        user_id: userId,
        name: values.name,
        description: values.description || null,
        allowed_types: values.allowedTypes,
      });

      if (error) {
        throw error;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not create the repository. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingPage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
        <p className="text-sm text-slate-300">Preparing the repository form...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <RepositoryForm
        eyebrow="New Repository"
        title="Create a repository for a specific kind of content."
        description="Choose a name, an optional description, and up to 3 content types. When you submit this form, the repository will be saved in Supabase."
        submitLabel="Create repository"
        submitPendingLabel="Creating repository..."
        backHref="/dashboard"
        backLabel="Back to dashboard"
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
        onSubmit={handleSubmit}
      />
    </main>
  );
}
