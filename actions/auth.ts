"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signUpSchema, loginSchema } from "@/lib/validation/schemas";
import type { ActionResult } from "@/actions/quests";

export async function signUp(input: unknown): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid sign-up details." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Always log the real error server-side. The generic messages below are
    // deliberately vague for the user (don't leak infra details), but that
    // used to mean the ONLY way to diagnose a broken signup was to guess —
    // this line makes the actual Supabase error visible in server logs.
    console.error("[signUp] Supabase auth error:", {
      code: error.code,
      status: error.status,
      message: error.message,
    });

    const code = error.code ?? "";
    const message = error.message.toLowerCase();

    if (code === "user_already_exists" || code === "email_exists" || message.includes("already registered")) {
      return { ok: false, error: "An account with that email already exists." };
    }
    if (code === "weak_password" || message.includes("weak") || message.includes("should contain")) {
      return { ok: false, error: "That password doesn't meet the site's security requirements. Try a longer or more varied one." };
    }
    if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || message.includes("rate limit")) {
      return { ok: false, error: "Too many attempts in a short time. Please wait a few minutes and try again." };
    }
    if (code === "signup_disabled" || (message.includes("signup") && message.includes("disabled"))) {
      return { ok: false, error: "New sign-ups are temporarily unavailable. Please try again later." };
    }
    if (code === "validation_failed" && message.includes("email")) {
      return { ok: false, error: "That email address looks invalid. Please double-check it." };
    }

    return { ok: false, error: "Couldn't create your account. Please try again." };
  }

  return { ok: true };
}

export async function login(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid login details." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, error: "Incorrect email or password." };
  }

  return { ok: true };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
