import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MODEL = "@cf/black-forest-labs/flux-2-klein-4b";
const BUCKET = Deno.env.get("STORAGE_BUCKET")
  ?? Deno.env.get("SUPABASE_STORAGE_BUCKET")
  ?? "park-concepts";
const MAX_CONCEPTS = 6;

type GenerationInput = {
  consultationId: string;
  sourceImageId?: string;
  conceptCount?: number;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function buildDesignBrief(feedback: Array<{ body: string; needs_snapshot?: unknown }>) {
  const needs = [...new Set(feedback.flatMap((item) =>
    Array.isArray(item.needs_snapshot) ? item.needs_snapshot.map(String) : []))];
  const requests = feedback.map((item) => item.body.trim()).filter(Boolean);
  return [
    "Preserve the existing park layout, mature trees, paths, and recognizable site features.",
    needs.length > 0 ? `Prioritise these community needs: ${needs.join(", ")}.` : "",
    requests.length > 0 ? `Combined community requests: ${requests.join(" | ")}` : "",
  ].filter(Boolean).join(" ");
}

function conceptPrompt(brief: string, variation: number) {
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

async function generateImage(prompt: string, sourceImage: Blob, seed: number) {
  const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  const token = Deno.env.get("CLOUDFLARE_API_TOKEN");
  if (!accountId || !token) throw new Error("Cloudflare FLUX secrets are not configured.");

  const form = new FormData();
  form.append("prompt", prompt);
  form.append("input_image_0", sourceImage, "park.jpg");
  form.append("width", "1024");
  form.append("height", "768");
  form.append("seed", String(seed));
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form },
  );
  if (!response.ok) {
    throw new Error(`Cloudflare FLUX request failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
  }
  const payload = await response.json() as { image?: string; result?: { image?: string } };
  const encodedImage = payload.image ?? payload.result?.image;
  if (!encodedImage) throw new Error("Cloudflare FLUX returned no image.");
  const bytes = Uint8Array.from(atob(encodedImage), (character) => character.charCodeAt(0));
  if (bytes.length === 0) throw new Error("Cloudflare FLUX returned an empty image.");
  return bytes;
}

async function handle(request: Request) {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Authentication required." }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const secretKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    ?? Deno.env.get("SUPABASE_SECRET_KEY")
    ?? Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!url || !secretKey) {
    return json({ error: "Supabase function secrets are not configured." }, 500);
  }

  const token = authorization.slice("Bearer ".length);
  const service = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await service.auth.getUser(token);
  if (authError || !authData.user) {
    return json({ error: `Authentication failed: ${authError?.message ?? "invalid access token"}` }, 401);
  }
  const { data: profile, error: profileError } = await service
    .from("users")
    .select("username")
    .eq("auth_user_id", authData.user.id)
    .single();
  if (profileError || !profile) return json({ error: "Account profile is missing." }, 403);

  let input: GenerationInput;
  try {
    input = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }
  if (!isUuid(input.consultationId)
    || (input.sourceImageId !== undefined && !isUuid(input.sourceImageId))) {
    return json({ error: "Invalid consultation or source image ID." }, 400);
  }
  const configuredCount = Number(Deno.env.get("FLUX_CONCEPT_COUNT") ?? input.conceptCount ?? 3);
  if (!Number.isInteger(configuredCount) || configuredCount < 1 || configuredCount > MAX_CONCEPTS) {
    return json({ error: "FLUX_CONCEPT_COUNT must be an integer between 1 and 6." }, 400);
  }

  const { data: job, error: claimError } = await service.rpc("claim_generation_job", {
    p_consultation_id: input.consultationId,
    p_requested_by: profile.username,
    p_source_image_id: input.sourceImageId ?? null,
    p_concept_count: configuredCount,
  }).single();
  if (claimError || !job) return json({ error: claimError?.message ?? "Unable to claim generation job." }, 409);

  try {
    const { data: source, error: sourceError } = await service
      .from("consultation_images")
      .select("park_image_id, park_images!inner(storage_key)")
      .eq("consultation_id", input.consultationId)
      .eq(input.sourceImageId ? "park_image_id" : "sort_order", input.sourceImageId ?? 0)
      .single();
    if (sourceError || !source) throw new Error("Consultation has no source park image.");

    const { data: feedback, error: feedbackError } = await service
      .from("consultation_feedback")
      .select("body, needs_snapshot")
      .eq("consultation_id", input.consultationId);
    if (feedbackError || !feedback || feedback.length < 15) {
      throw new Error("Concept generation requires 15 completed feedback submissions.");
    }
    const brief = buildDesignBrief(feedback);
    const sourceRecord = source.park_images as unknown as { storage_key: string };
    const { data: sourceImage, error: downloadError } = await service.storage
      .from(BUCKET)
      .download(sourceRecord.storage_key);
    if (downloadError || !sourceImage) throw new Error(`Unable to load source park image: ${downloadError?.message ?? "missing image"}`);

    for (let index = 0; index < configuredCount; index += 1) {
      const image = await generateImage(conceptPrompt(brief, index), sourceImage, index + 1);
      const key = `${input.consultationId}/${job.id}/${index + 1}.jpg`;
      const { error: uploadError } = await service.storage
        .from(BUCKET)
        .upload(key, image, { contentType: "image/jpeg", upsert: false });
      if (uploadError) throw new Error(`Unable to store generated concept: ${uploadError.message}`);

      const { error: conceptError } = await service.from("official_concepts").insert({
        consultation_id: input.consultationId,
        generation_request_id: job.id,
        source_park_image_id: source.park_image_id,
        name: `Community concept ${index + 1}`,
        tagline: "Generated from combined community feedback",
        description: brief,
        design_brief: brief,
        community_needs: feedback.flatMap((item) =>
          Array.isArray(item.needs_snapshot) ? item.needs_snapshot : []),
        image_storage_key: key,
        status: "draft",
      });
      if (conceptError) throw new Error(`Unable to save generated concept: ${conceptError.message}`);
    }

    const { error: publishError } = await service.rpc("publish_generation_job", { p_job_id: job.id });
    if (publishError) throw new Error(`Unable to publish complete concept set: ${publishError.message}`);
    return json({ ok: true, jobId: job.id, model: MODEL });
  } catch (error) {
    await service.from("generation_requests").update({
      status: "failed",
      failure_message: error instanceof Error ? error.message : "Generation failed.",
      completed_at: new Date().toISOString(),
    }).eq("id", job.id);
    return json({ error: error instanceof Error ? error.message : "Generation failed." }, 502);
  }
}

Deno.serve((request) => handle(request));
