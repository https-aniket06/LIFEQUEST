import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="font-pixel text-4xl text-ember">404</p>
      <h1 className="mt-4 text-lg text-ink-text">This quest doesn't exist.</h1>
      <p className="mt-2 text-sm text-muted-text">The page you're looking for wandered off the map.</p>
      <Link href="/dashboard" className="pixel-button mt-6">
        RETURN TO HUD
      </Link>
    </main>
  );
}
