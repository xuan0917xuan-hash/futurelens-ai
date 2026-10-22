import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getCookies, setCookie } from "@tanstack/react-start/server";

function envValue(...names: string[]): string | undefined {
  return names.map((name) => process.env[name]).find(Boolean);
}

function requiredSupabaseUrl(): string {
  const value = envValue("SUPABASE_URL", "VITE_SUPABASE_URL");
  if (!value) throw new Error("Missing required server environment variable: SUPABASE_URL");
  return value;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    envValue("SUPABASE_URL", "VITE_SUPABASE_URL")
      && envValue("SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_ANON_KEY"),
  );
}

export function createRequestSupabaseClient() {
  const publishableKey = envValue("SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_ANON_KEY");
  if (!publishableKey) throw new Error("Missing required server environment variable: SUPABASE_PUBLISHABLE_KEY");
  return createServerClient(requiredSupabaseUrl(), publishableKey, {
    cookies: {
      getAll() {
        return Object.entries(getCookies()).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          setCookie(name, value, {
            ...options,
            httpOnly: true,
            path: options?.path ?? "/",
            sameSite: options?.sameSite ?? "lax",
            secure: process.env.NODE_ENV === "production",
          });
        }
      },
    },
  });
}

export function createServiceSupabaseClient() {
  const secretKey = envValue("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY");
  if (!secretKey) throw new Error("Missing required server environment variable: SUPABASE_SECRET_KEY");
  return createClient(requiredSupabaseUrl(), secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function usernameEmail(username: string): string {
  const domain = process.env.SUPABASE_USERNAME_EMAIL_DOMAIN;
  if (!domain) throw new Error("Missing required server environment variable: SUPABASE_USERNAME_EMAIL_DOMAIN");
  return `${username}@${domain}`;
}
