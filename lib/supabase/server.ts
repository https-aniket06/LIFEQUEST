import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";

/**
 * Server-side Supabase client, scoped to the current user's session cookie.
 *
 * IMPORTANT: this uses the ANON key + the user's own auth cookie, so every
 * query made through this client is still subject to Row Level Security.
 * The service-role key is NEVER used here and must never be imported into
 * any file that ships to the client bundle.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component with no writable cookie jar
            // (e.g. during a static render). Session refresh happens in
            // middleware.ts instead, so this is safe to ignore.
          }
        },
      },
    }
  );
}
