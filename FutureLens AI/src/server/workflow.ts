import { z } from "zod";

export const feedbackSubmissionSchema = z.object({
  consultationId: z.string().uuid(),
  sourceImageId: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
});

export const generationJobSchema = z.object({
  consultationId: z.string().uuid(),
  sourceImageId: z.string().uuid().optional(),
  conceptCount: z.number().int().min(1).max(6).default(3),
});

export function buildDesignBrief(feedback: Array<{ body: string }>): string {
  const requests = feedback.map((item) => item.body.trim()).filter(Boolean);
  return [
    "Preserve the existing park layout, mature trees, paths, and recognizable site features.",
    requests.length > 0 ? `Combined community requests: ${requests.join(" | ")}` : "",
  ].filter(Boolean).join(" ");
}

export function conceptPrompt(brief: string, variation: number): string {
  const directions = [
    "Emphasise shaded seating and ecological planting.",
    "Emphasise child-friendly gathering and play areas.",
    "Emphasise universal accessibility, safety, and calm spaces.",
    "Balance greenery, gathering, play, and accessibility.",
    "Emphasise flexible community activity areas.",
    "Emphasise low-maintenance climate-resilient improvements.",
  ];
  return `Architectural landscape concept visualization of the same existing neighbourhood park, viewed from the original photograph. ${brief} ${directions[variation % directions.length]} Photorealistic, no text, no labels, preserve the original camera perspective and site boundaries.`;
}

export function hasCompleteConceptSet(
  concepts: Array<{ status: string; image_storage_key: string | null }>,
  expectedCount: number,
): boolean {
  return concepts.length === expectedCount && concepts.every(
    (concept) => concept.status === "draft" && Boolean(concept.image_storage_key),
  );
}

export function hasReachedFeedbackThreshold(count: number, threshold = 15): boolean {
  return count >= threshold;
}

export function isRetryableGenerationStatus(status: string): boolean {
  return status === "failed";
}
