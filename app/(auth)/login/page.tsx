import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Log in — LIFEQUEST" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
      <h1 className="font-pixel text-center text-lg text-ink-text">ENTER THE WORLD</h1>
      <p className="mt-2 text-center text-sm text-muted-text">Log in to continue your quest.</p>
      <div className="mt-8">
        <AuthForm mode="login" />
      </div>
      <p className="mt-6 text-center text-sm text-muted-text">
        New here?{" "}
        <Link href="/signup" className="text-aether underline underline-offset-2">
          Create a character
        </Link>
      </p>
    </main>
  );
}
