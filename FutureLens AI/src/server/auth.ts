import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  createRequestSupabaseClient,
  createServiceSupabaseClient,
  isSupabaseConfigured,
  usernameEmail,
} from "./supabase";
import { assertRole } from "./authorization";

export const credentialsSchema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,32}$/),
  password: z.string().min(8).max(128),
});

export const signupSchema = credentialsSchema.extend({
  email: z.string().trim().email().max(254),
  displayName: z.string().trim().min(1).max(80).optional(),
});

export type AuthUser = {
  username: string;
  role: "resident" | "developer";
  displayName: string | null;
};

function unavailable() {
  return { configured: false as const, user: null };
}

async function getProfile(authUserId: string): Promise<AuthUser | null> {
  const supabase = createRequestSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("username, role, display_name")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (error) throw new Error(`Unable to load user profile: ${error.message}`);
  if (!data) return null;
  return {
    username: data.username,
    role: data.role,
    displayName: data.display_name,
  };
}

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  if (!isSupabaseConfigured()) return unavailable();
  const supabase = createRequestSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { configured: true as const, user: null };
  return { configured: true as const, user: await getProfile(data.user.id) };
});

export const signUp = createServerFn({ method: "POST" })
  .validator(signupSchema)
  .handler(async ({ data }) => {
    if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");
    const supabase = createRequestSupabaseClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { username: data.username } },
    });
    if (authError) throw new Error(`Unable to create account: ${authError.message}`);
    if (!authData.user) throw new Error("Supabase did not return a user.");

    const { error: profileError } = await createServiceSupabaseClient().from("users").insert({
      username: data.username,
      email: data.email,
      auth_user_id: authData.user.id,
      role: "resident",
      display_name: data.displayName ?? null,
    });
    if (profileError) throw new Error(`Unable to create user profile: ${profileError.message}`);
    return { user: await getProfile(authData.user.id) };
  });

export const signIn = createServerFn({ method: "POST" })
  .validator(credentialsSchema)
  .handler(async ({ data }) => {
    if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");
    const supabase = createRequestSupabaseClient();
    const { data: profile } = await createServiceSupabaseClient().from("users").select("email").eq("username", data.username).maybeSingle();
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: profile?.email ?? usernameEmail(data.username),
      password: data.password,
    });
    if (error || !authData.user) throw new Error("Invalid username or password.");
    const user = await getProfile(authData.user.id);
    if (!user) throw new Error("Account profile is missing.");
    return { user };
  });

export const signInDeveloper = createServerFn({ method: "POST" })
  .validator(credentialsSchema)
  .handler(async ({ data }) => {
    const result = await signIn({ data });
    if (result.user?.role !== "developer") {
      await signOut();
      throw new Error("This account is not registered as a developer account.");
    }
    return result;
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  if (!isSupabaseConfigured()) return { ok: true };
  const { error } = await createRequestSupabaseClient().auth.signOut();
  if (error) throw new Error(`Unable to sign out: ${error.message}`);
  return { ok: true };
});

export async function requireUser(role?: AuthUser["role"]): Promise<AuthUser> {
  const result = await getCurrentUser();
  if (!result.configured || !result.user) throw new Error("Authentication required.");
  if (role) assertRole(result.user.role, role);
  return result.user;
}
