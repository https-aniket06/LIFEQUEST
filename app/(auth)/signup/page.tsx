import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Create your character — LIFEQUEST" };

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
      <h1 className="font-pixel text-center text-lg text-ink-text">START YOUR QUEST</h1>
      <p className="mt-2 text-center text-sm text-muted-text">Create a character to begin.</p>
      <div className="mt-8">
        <AuthForm mode="signup" />
      </div>
      <p className="mt-6 text-center text-sm text-muted-text">
        Already playing?{" "}
        <Link href="/login" className="text-aether underline underline-offset-2">
          Log in
        </Link>
      </p>
    </main>
  );
}
