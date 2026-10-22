import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireUser } from "./auth";
import { createServiceSupabaseClient, isSupabaseConfigured } from "./supabase";

const dashboardSchema = z.object({ consultationId: z.string().uuid() });

export type DeveloperDashboardData = {
  consultation: {
    title: string;
    phase: string;
    feedbackThreshold: number;
  };
  feedbackCount: number;
  participantCount: number;
  voteCount: number;
  concepts: Array<{ id: string; name: string; status: string; imageReady: boolean; votes: number }>;
  recentRequests: Array<{ body: string; createdAt: string }>;
};

export const getDeveloperDashboard = createServerFn({ method: "GET" })
  .validator(dashboardSchema)
  .handler(async ({ data }): Promise<DeveloperDashboardData> => {
    await requireUser("developer");
    if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");

    const supabase = createServiceSupabaseClient();
    const [consultationResult, feedbackResult, votesResult, conceptsResult] = await Promise.all([
      supabase.from("consultations").select("title, phase, feedback_threshold").eq("id", data.consultationId).single(),
      supabase.from("consultation_feedback").select("username, body, created_at").eq("consultation_id", data.consultationId).order("created_at", { ascending: false }),
      supabase.from("votes").select("official_concept_id").eq("consultation_id", data.consultationId),
      supabase.from("official_concepts").select("id, name, status, image_storage_key").eq("consultation_id", data.consultationId).order("created_at"),
    ]);
    if (consultationResult.error || !consultationResult.data) throw new Error(`Unable to load consultation statistics: ${consultationResult.error?.message ?? "not found"}`);
    if (feedbackResult.error) throw new Error(`Unable to load resident feedback: ${feedbackResult.error.message}`);
    if (votesResult.error) throw new Error(`Unable to load votes: ${votesResult.error.message}`);
    if (conceptsResult.error) throw new Error(`Unable to load generated concepts: ${conceptsResult.error.message}`);

    const feedback = feedbackResult.data ?? [];
    const votes = votesResult.data ?? [];
    const concepts = conceptsResult.data ?? [];
    return {
      consultation: {
        title: consultationResult.data.title,
        phase: consultationResult.data.phase,
        feedbackThreshold: consultationResult.data.feedback_threshold,
      },
      feedbackCount: feedback.length,
      participantCount: new Set(feedback.map((item) => item.username)).size,
      voteCount: votes.length,
      concepts: concepts.map((concept) => ({
        id: concept.id,
        name: concept.name,
        status: concept.status,
        imageReady: Boolean(concept.image_storage_key),
        votes: votes.filter((vote) => vote.official_concept_id === concept.id).length,
      })),
      recentRequests: feedback.slice(0, 5).map((item) => ({ body: item.body, createdAt: item.created_at })),
    };
  });
