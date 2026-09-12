"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, signUp } from "@/actions/auth";

interface AuthFormProps {
  mode: "login" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [signedUp, setSignedUp] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      if (mode === "signup") {
        const result = await signUp({ email, password, confirmPassword });
        if (!result.ok) {
          setError(result.error ?? "Something went wrong.");
        } else {
          setSignedUp(true);
        }
      } else {
        const result = await login({ email, password });
        if (!result.ok) {
          setError(result.error ?? "Something went wrong.");
        } else {
          router.push("/dashboard");
          router.refresh();
        }
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (signedUp) {
    return (
      <div className="pixel-panel p-6 text-center">
        <p className="text-ink-text">Check your email to confirm your account, then log in.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="pixel-panel space-y-4 p-6" noValidate>
      <div>
        <label htmlFor="email" className="mb-1 block text-xs text-muted-text">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border-2 border-edge bg-panel-2 px-3 py-2 text-ink-text outline-none focus-visible:border-aether"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-xs text-muted-text">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border-2 border-edge bg-panel-2 px-3 py-2 text-ink-text outline-none focus-visible:border-aether"
        />
        {mode === "signup" && (
          <p className="mt-1 text-[0.7rem] text-muted-text">At least 8 characters, one uppercase letter, one number.</p>
        )}
      </div>

      {mode === "signup" && (
        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-xs text-muted-text">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border-2 border-edge bg-panel-2 px-3 py-2 text-ink-text outline-none focus-visible:border-aether"
          />
        </div>
      )}

      {error && (
        <p role="alert" className="border-2 border-vitality bg-vitality/10 px-3 py-2 text-sm text-vitality">
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} className="pixel-button w-full">
        {pending ? "WORKING..." : mode === "signup" ? "CREATE CHARACTER" : "LOG IN"}
      </button>
    </form>
  );
}
