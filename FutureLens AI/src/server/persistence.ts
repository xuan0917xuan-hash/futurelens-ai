import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireUser } from "./auth";
import { createRequestSupabaseClient, isSupabaseConfigured } from "./supabase";
import { feedbackSubmissionSchema } from "./workflow";
import { runConceptGeneration } from "./generation";

export const voteSchema = z.object({
  consultationId: z.string().uuid(),
  conceptId: z.string().uuid(),
  feedback: z.string().trim().max(4000).optional(),
});

export const generationSchema = z.object({
  consultationId: z.string().uuid(),
  sourceImageId: z.string().uuid().optional(),
  prompt: z.string().trim().max(4000).optional(),
});

export const submitVote = createServerFn({ method: "POST" })
  .validator(voteSchema)
  .handler(async ({ data }) => {
    const user = await requireUser();
    if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");
    const supabase = createRequestSupabaseClient();
    const { error: voteError } = await supabase.from("votes").insert({
      consultation_id: data.consultationId,
      official_concept_id: data.conceptId,
      username: user.username,
    });
    if (voteError) throw new Error(`Unable to record vote: ${voteError.message}`);

    if (data.feedback) {
      const { error: feedbackError } = await supabase.from("feedback").insert({
        consultation_id: data.consultationId,
        official_concept_id: data.conceptId,
        username: user.username,
        body: data.feedback,
      });
      if (feedbackError) throw new Error(`Unable to record feedback: ${feedbackError.message}`);
    }
    return { ok: true };
  });

export const requestConceptGeneration = createServerFn({ method: "POST" })
  .validator(generationSchema)
  .handler(async ({ data }) => {
    const user = await requireUser();
    if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");
    const { data: request, error } = await createRequestSupabaseClient()
      .from("generation_requests")
      .insert({
        consultation_id: data.consultationId,
        requested_by: user.username,
        source_image_id: data.sourceImageId ?? null,
        prompt: data.prompt ?? null,
      })
      .select("id, status")
      .single();
    if (error) throw new Error(`Unable to create generation request: ${error.message}`);
    return request;
  });

export const submitImprovementFeedback = createServerFn({ method: "POST" })
  .validator(feedbackSubmissionSchema)
  .handler(async ({ data }) => {
    const user = await requireUser();
    if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");
    const { data: submission, error } = await createRequestSupabaseClient()
      .from("consultation_feedback")
      .insert({
        consultation_id: data.consultationId,
        source_image_id: data.sourceImageId,
        username: user.username,
        body: data.body,
      })
      .select("id, created_at")
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("You have already submitted feedback for this consultation.");
      throw new Error(`Unable to submit feedback: ${error.message}`);
    }
    let generation: { ok: boolean; jobId?: string; model?: string; error?: string } = { ok: false };
    const { data: consultation } = await createRequestSupabaseClient()
      .from("consultations")
      .select("phase, feedback_threshold, consultation_feedback(count)")
      .eq("id", data.consultationId)
      .single();
    const feedbackCount = Array.isArray(consultation?.consultation_feedback)
      ? Number(consultation.consultation_feedback[0]?.count ?? 0)
      : 0;
    const thresholdReached = feedbackCount >= Number(consultation?.feedback_threshold ?? 15);
    if (thresholdReached && consultation?.phase !== "closed") {
      try {
        generation = await runConceptGeneration(
          data.consultationId,
          data.sourceImageId,
        );
      } catch (generationError) {
        generation = {
          ok: false,
          error: generationError instanceof Error ? generationError.message : "Automatic generation failed.",
        };
      }
    }
    return { ...submission, generation };
  });
