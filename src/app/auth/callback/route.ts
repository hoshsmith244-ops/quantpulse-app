import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Magic-link landing route.
 *
 * Supabase sends the user here with a one-time `code`; exchanging it sets the
 * session cookies and the browser client picks the session up from there.
 *
 * Redirect targets are deliberately restricted to same-origin paths. `next` is
 * attacker-controllable — it arrives in a URL that can be put in front of
 * anyone — so an unchecked value turns this into an open redirect that lends
 * the app's domain to a phishing page.
 */

export const dynamic = "force-dynamic";

function safePath(raw: string | null): string {
  if (!raw) return "/membership";
  // Must be a plain absolute path: no scheme, no host, no protocol-relative.
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/membership";
  if (raw.includes("://")) return "/membership";
  return raw;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safePath(url.searchParams.get("next"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return NextResponse.redirect(new URL("/membership?sync=unconfigured", url.origin));
  }
  if (!code) {
    return NextResponse.redirect(new URL("/membership?sync=missing-code", url.origin));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        for (const { name, value, options } of list) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/membership?sync=link-expired", url.origin));
  }

  return NextResponse.redirect(new URL(`${next}?sync=signed-in`, url.origin));
}
