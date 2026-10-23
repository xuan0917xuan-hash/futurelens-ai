import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireUser } from "./auth";
import { createRequestSupabaseClient, createServiceSupabaseClient, isSupabaseConfigured } from "./supabase";

const publishedConceptsSchema = z.object({
  consultationId: z.string().uuid(),
});

export type PublishedConcept = {
  id: string;
  name: string;
  tagline: string | null;
  description: string;
  imageUrl: string | null;
  features: string[];
};

export type ConsultationVotingState = {
  phase: "feedback_open" | "preparing" | "voting_open" | "closed";
  feedbackCount: number;
  feedbackThreshold: number;
  generationStatus: "queued" | "running" | "completed" | "failed" | null;
};

export const getConsultationVotingState = createServerFn({ method: "GET" })
  .validator(publishedConceptsSchema)
  .handler(async ({ data }): Promise<ConsultationVotingState> => {
    await requireUser();
    if (!isSupabaseConfigured()) {
      return { phase: "voting_open", feedbackCount: 15, feedbackThreshold: 15, generationStatus: "completed" };
    }
    const service = createServiceSupabaseClient();
    const { data: consultation, error } = await service
      .from("consultations")
      .select("phase, feedback_threshold, consultation_feedback(count)")
      .eq("id", data.consultationId)
      .single();
    if (error || !consultation) throw new Error(`Unable to load consultation status: ${error?.message ?? "not found"}`);
    const feedbackCount = Array.isArray(consultation.consultation_feedback)
      ? Number(consultation.consultation_feedback[0]?.count ?? 0)
      : 0;
    const { data: generation } = await service
      .from("generation_requests")
      .select("status")
      .eq("consultation_id", data.consultationId)
      .eq("generation_type", "community")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return {
      phase: consultation.phase,
      feedbackCount,
      feedbackThreshold: consultation.feedback_threshold,
      generationStatus: (generation?.status as ConsultationVotingState["generationStatus"]) ?? null,
    };
  });

export const getPublishedConcepts = createServerFn({ method: "GET" })
  .validator(publishedConceptsSchema)
  .handler(async ({ data }): Promise<PublishedConcept[]> => {
    await requireUser();
    if (!isSupabaseConfigured()) return [];

    const supabase = createRequestSupabaseClient();
    const { data: concepts, error } = await supabase
      .from("official_concepts")
      .select("id, name, tagline, description, image_storage_key, official_concept_features(label)")
      .eq("consultation_id", data.consultationId)
      .eq("status", "published")
      .order("created_at");
    if (error) throw new Error(`Unable to load published concepts: ${error.message}`);

    return Promise.all((concepts ?? []).map(async (concept) => {
      let imageUrl: string | null = null;
      if (concept.image_storage_key) {
        const { data: signed, error: signedError } = await service.storage
          .from(process.env.STORAGE_BUCKET ?? process.env.SUPABASE_STORAGE_BUCKET ?? "park-concepts")
          .createSignedUrl(concept.image_storage_key, 600);
        if (signedError) throw new Error(`Unable to load concept image: ${signedError.message}`);
        imageUrl = signed.signedUrl;
      }
      return {
        id: concept.id,
        name: concept.name,
        tagline: concept.tagline,
        description: concept.description,
        imageUrl,
        features: (concept.official_concept_features ?? []).map((feature) => feature.label),
      };
    }));
  });
