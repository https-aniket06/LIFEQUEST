import Link from "next/link";
import { logout } from "@/actions/auth";

const LINKS = [
  { href: "/dashboard", label: "HUD" },
  { href: "/quests", label: "QUESTS" },
  { href: "/shop", label: "SHOP" },
  { href: "/inventory", label: "INVENTORY" },
  { href: "/achievements", label: "BADGES" },
  { href: "/character", label: "CHARACTER" },
];

export function AppNav() {
  return (
    <header className="border-b border-edge">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6" aria-label="Main navigation">
        <Link href="/dashboard" className="font-pixel text-xs text-ember">
          LIFEQUEST
        </Link>
        <ul className="flex flex-wrap items-center gap-4 text-xs text-muted-text">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="hover:text-aether">
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <form action={logout}>
              <button type="submit" className="hover:text-vitality">
                LOG OUT
              </button>
            </form>
          </li>
        </ul>
      </nav>
    </header>
  );
}
