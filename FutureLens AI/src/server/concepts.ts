import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireUser } from "./auth";
import { createRequestSupabaseClient, isSupabaseConfigured } from "./supabase";

const personalConceptSchema = z.object({
  generationRequestId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(4000).optional(),
  visibility: z.enum(["private", "shared", "submitted"]).default("private"),
});

const sharingSchema = z.object({
  conceptId: z.string().uuid(),
  username: z.string().regex(/^[a-z0-9_]{3,32}$/),
  canEdit: z.boolean().default(false),
});

const responseSchema = z.object({
  consultationId: z.string().uuid(),
  feedbackId: z.string().uuid().optional(),
  body: z.string().trim().min(1).max(4000),
  status: z.enum(["draft", "published"]).default("draft"),
});

export const savePersonalConcept = createServerFn({ method: "POST" })
  .validator(personalConceptSchema)
  .handler(async ({ data }) => {
    const user = await requireUser();
    if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");
    const { data: concept, error } = await createRequestSupabaseClient()
      .from("personal_concepts")
      .insert({
        generation_request_id: data.generationRequestId ?? null,
        owner_username: user.username,
        title: data.title,
        description: data.description ?? null,
        visibility: data.visibility,
      })
      .select("id, title, visibility, created_at")
      .single();
    if (error) throw new Error(`Unable to save concept: ${error.message}`);
    return concept;
  });

export const sharePersonalConcept = createServerFn({ method: "POST" })
  .validator(sharingSchema)
  .handler(async ({ data }) => {
    const user = await requireUser();
    if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");
    const supabase = createRequestSupabaseClient();
    const { data: ownedConcept, error: ownerError } = await supabase
      .from("personal_concepts")
      .select("id")
      .eq("id", data.conceptId)
      .eq("owner_username", user.username)
      .single();
    if (ownerError || !ownedConcept) throw new Error("You may only share concepts you own.");
    const { error } = await supabase.from("concept_sharing_permissions").upsert({
      personal_concept_id: data.conceptId,
      username: data.username,
      can_edit: data.canEdit,
    });
    if (error) throw new Error(`Unable to share concept: ${error.message}`);
    return { ok: true };
  });

export const createDeveloperResponse = createServerFn({ method: "POST" })
  .validator(responseSchema)
  .handler(async ({ data }) => {
    const user = await requireUser("developer");
    if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");
    const { data: response, error } = await createRequestSupabaseClient()
      .from("developer_responses")
      .insert({
        consultation_id: data.consultationId,
        feedback_id: data.feedbackId ?? null,
        author_username: user.username,
        body: data.body,
        status: data.status,
      })
      .select("id, status, created_at")
      .single();
    if (error) throw new Error(`Unable to save developer response: ${error.message}`);
    return response;
  });
