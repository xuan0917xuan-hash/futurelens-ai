import { createServerFn } from "@tanstack/react-start";

import { requireUser } from "./auth";
import { createRequestSupabaseClient, isSupabaseConfigured } from "./supabase";
import { generationJobSchema } from "./workflow";

export async function runConceptGeneration(
  consultationId: string,
  sourceImageId?: string,
  conceptCount = 3,
) {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");
  const supabase = createRequestSupabaseClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error(`Unable to read authentication session: ${sessionError.message}`);
  if (!sessionData.session) throw new Error("Authentication required.");
  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) throw new Error(`Unable to refresh authentication session: ${refreshError.message}`);
  const accessToken = refreshed.session?.access_token ?? sessionData.session.access_token;
  const { data, error } = await supabase.functions.invoke("generate-concepts", {
    body: { consultationId, sourceImageId, conceptCount },
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (error) {
    throw new Error(`Unable to generate concepts: ${error.message}`);
  }
  return data as { ok: true; jobId: string; model: string };
}

export const startConceptGeneration = createServerFn({ method: "POST" })
  .validator(generationJobSchema)
  .handler(async ({ data }) => {
    await requireUser();
    return runConceptGeneration(data.consultationId, data.sourceImageId, data.conceptCount);
  });
