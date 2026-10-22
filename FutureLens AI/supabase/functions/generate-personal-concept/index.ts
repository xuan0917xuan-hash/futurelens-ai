import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MODEL = "@cf/black-forest-labs/flux-2-klein-4b";
const BUCKET = Deno.env.get("STORAGE_BUCKET")
  ?? Deno.env.get("SUPABASE_STORAGE_BUCKET")
  ?? "park-concepts";

type Input = {
  consultationId: string;
  sourceImageId: string;
  prompt: string;
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

async function generateImage(prompt: string, sourceImage: Blob) {
  const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = Deno.env.get("CLOUDFLARE_API_TOKEN");
  if (!accountId || !apiToken) throw new Error("Cloudflare FLUX secrets are not configured.");
  const form = new FormData();
  form.append("prompt", prompt);
  form.append("input_image_0", sourceImage, "park.jpg");
  form.append("width", "1024");
  form.append("height", "768");
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`,
    { method: "POST", headers: { Authorization: `Bearer ${apiToken}` }, body: form },
  );
  if (!response.ok) throw new Error(`Cloudflare FLUX request failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
  const payload = await response.json() as { image?: string; result?: { image?: string } };
  const encodedImage = payload.image ?? payload.result?.image;
  if (!encodedImage) throw new Error("Cloudflare FLUX returned no image.");
  const image = Uint8Array.from(atob(encodedImage), (character) => character.charCodeAt(0));
  if (image.length === 0) throw new Error("Cloudflare FLUX returned an empty image.");
  return image;
}

async function handle(request: Request) {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Authentication required." }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const secretKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    ?? Deno.env.get("SUPABASE_SECRET_KEY")
    ?? Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!url || !secretKey) return json({ error: "Supabase function secrets are not configured." }, 500);

  const token = authorization.slice("Bearer ".length);
  const service = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: authData, error: authError } = await service.auth.getUser(token);
  if (authError || !authData.user) {
    return json({ error: `Authentication failed: ${authError?.message ?? "invalid access token"}` }, 401);
  }
  const { data: profile, error: profileError } = await service
    .from("users").select("username, role").eq("auth_user_id", authData.user.id).single();
  if (profileError || !profile || profile.role !== "resident") return json({ error: "A resident account is required." }, 403);

  let input: Input;
  try {
    input = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }
  if (!isUuid(input.consultationId) || !isUuid(input.sourceImageId)
    || typeof input.prompt !== "string" || input.prompt.trim().length < 1) {
    return json({ error: "Invalid personal generation request." }, 400);
  }

  const { data: job, error: claimError } = await service.rpc("claim_personal_generation_job", {
    p_consultation_id: input.consultationId,
    p_requested_by: profile.username,
    p_source_image_id: input.sourceImageId,
    p_prompt: input.prompt.trim(),
  }).single();
  if (claimError || !job) return json({ error: claimError?.message ?? "Unable to claim personal generation." }, 409);

  try {
    const { data: source, error: sourceError } = await service
      .from("park_images").select("storage_key").eq("id", input.sourceImageId).single();
    if (sourceError || !source) throw new Error("Selected park image was not found.");
    const { data: sourceImage, error: downloadError } = await service.storage.from(BUCKET).download(source.storage_key);
    if (downloadError || !sourceImage) throw new Error(`Unable to load source park image: ${downloadError?.message ?? "missing image"}`);

    const brief = `Improve this existing neighbourhood park based on the resident request: ${input.prompt.trim()} Preserve the original layout, mature trees, paths, site boundaries, and camera perspective. Photorealistic architectural landscape visualization, no text or labels.`;
    const image = await generateImage(brief, sourceImage);
    const key = `${input.consultationId}/personal/${profile.username}/${job.id}.jpg`;
    const { error: uploadError } = await service.storage.from(BUCKET)
      .upload(key, image, { contentType: "image/jpeg", upsert: false });
    if (uploadError) throw new Error(`Unable to store personal design image: ${uploadError.message}`);
    const { error: conceptError } = await service.from("personal_concepts").insert({
      generation_request_id: job.id,
      owner_username: profile.username,
      title: "My park design",
      description: input.prompt.trim(),
      source_park_image_id: input.sourceImageId,
      image_storage_key: key,
      visibility: "private",
      status: "ready",
    });
    if (conceptError) throw new Error(`Unable to save personal design: ${conceptError.message}`);
    const { error: completeError } = await service.rpc("complete_personal_generation_job", { p_job_id: job.id });
    if (completeError) throw new Error(`Unable to complete personal generation: ${completeError.message}`);
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
