import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireUser } from "./auth";
import { createRequestSupabaseClient, createServiceSupabaseClient, isSupabaseConfigured } from "./supabase";

const personalGenerationSchema = z.object({
  consultationId: z.string().uuid(),
  sourceImageId: z.string().uuid(),
  prompt: z.string().trim().min(1).max(4000),
});

export const generatePersonalConcept = createServerFn({ method: "POST" })
  .validator(personalGenerationSchema)
  .handler(async ({ data }) => {
    const user = await requireUser("resident");
    if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");
    const supabase = createRequestSupabaseClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw new Error(`Unable to read authentication session: ${sessionError.message}`);
    if (!sessionData.session) throw new Error("Authentication required.");
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) throw new Error(`Unable to refresh authentication session: ${refreshError.message}`);
    const accessToken = refreshed.session?.access_token ?? sessionData.session.access_token;
    const { data: result, error } = await supabase.functions.invoke("generate-personal-concept", {
      body: data,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (error) {
      let detail = error.message;
      if ("context" in error && error.context instanceof Response) {
        try {
          const body = await error.context.clone().json() as { error?: string };
          if (body.error) detail = body.error;
        } catch {
          // Keep Supabase's original error when the function response is not JSON.
        }
      }
      throw new Error(`Unable to generate your design image: ${detail}`);
    }
    return result as { ok: true; jobId: string; model: string; username: string };
  });

export const getMyPersonalConcept = createServerFn({ method: "GET" })
  .validator(z.object({ consultationId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const user = await requireUser("resident");
    if (!isSupabaseConfigured()) return null;
    const supabase = createRequestSupabaseClient();
    const { data: request } = await supabase
      .from("generation_requests")
      .select("id")
      .eq("consultation_id", data.consultationId)
      .eq("requested_by", user.username)
      .eq("generation_type", "personal")
      .eq("status", "completed")
      .maybeSingle();
    if (!request) return null;
    const { data: concept, error } = await supabase
      .from("personal_concepts")
      .select("id, title, description, image_storage_key, created_at")
      .eq("owner_username", user.username)
      .eq("generation_request_id", request.id)
      .maybeSingle();
    if (error) throw new Error(`Unable to load your personal design: ${error.message}`);
    if (!concept) return null;
    if (!concept.image_storage_key) return { ...concept, imageUrl: null };
    const { data: signed, error: signedError } = await createServiceSupabaseClient()
      .storage.from(process.env.STORAGE_BUCKET ?? process.env.SUPABASE_STORAGE_BUCKET ?? "park-concepts")
      .createSignedUrl(concept.image_storage_key, 600);
    if (signedError) throw new Error(`Unable to load your personal design image: ${signedError.message}`);
    return { ...concept, imageUrl: signed.signedUrl };
  });
