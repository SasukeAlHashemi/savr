"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ProfileForm,
  type ProfileFormValues,
} from "@/components/profile-form";
import {
  AVATAR_BUCKET,
  buildAvatarPath,
  isAllowedAvatarFile,
} from "@/lib/profiles";
import { createClient } from "@/lib/supabase/client";

function getFriendlyProfileErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Could not save your profile. Please try again.";
  }

  if (error.message.toLowerCase().includes("duplicate")) {
    return "That username is already taken. Please choose another one.";
  }

  return error.message;
}

export default function ProfileOnboardingPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadOnboardingState() {
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

      const { data: profileRow, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, avatar_path, created_at")
        .eq("id", user.id)
        .maybeSingle();

      if (!isActive) {
        return;
      }

      if (profileError) {
        setErrorMessage(
          "The profiles table is not set up yet. Run the profile SQL files in Supabase, then refresh this page.",
        );
        setIsLoadingPage(false);
        return;
      }

      if (profileRow) {
        router.replace("/dashboard");
        return;
      }

      setUserId(user.id);
      setErrorMessage("");
      setIsLoadingPage(false);
    }

    void loadOnboardingState();

    return () => {
      isActive = false;
    };
  }, [router]);

  async function handleSubmit(values: ProfileFormValues) {
    if (!userId) {
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    const supabase = createClient();
    let avatarPath: string | null = null;

    try {
      if (values.avatarFile) {
        if (!isAllowedAvatarFile(values.avatarFile)) {
          throw new Error("Please upload a JPG, PNG, or WEBP image.");
        }

        avatarPath = buildAvatarPath(userId, values.avatarFile.name);
        const { error: uploadError } = await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(avatarPath, values.avatarFile, {
            contentType: values.avatarFile.type || undefined,
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }
      }

      const { error: insertError } = await supabase.from("profiles").insert({
        id: userId,
        username: values.username,
        avatar_path: avatarPath,
      });

      if (insertError) {
        if (avatarPath) {
          await supabase.storage.from(AVATAR_BUCKET).remove([avatarPath]);
        }

        throw insertError;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setErrorMessage(getFriendlyProfileErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingPage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
        <p className="text-sm text-slate-300">Preparing profile setup...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <ProfileForm
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
        onSubmit={handleSubmit}
      />
    </main>
  );
}
