import { z } from "zod";

const fluxResponseSchema = z.object({
  image: z.string().min(1),
});

export const FLUX_MODEL = "@cf/black-forest-labs/flux-2-klein-4b";

export type FluxGenerationInput = {
  prompt: string;
  sourceImage: Blob;
  width?: number;
  height?: number;
  seed?: number;
};

export async function generateFluxImage(
  input: FluxGenerationInput,
  dependencies: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<Uint8Array> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) throw new Error("Cloudflare FLUX is not configured.");

  const form = new FormData();
  form.append("prompt", input.prompt);
  form.append("input_image_0", input.sourceImage, "park.jpg");
  form.append("width", String(input.width ?? 1024));
  form.append("height", String(input.height ?? 768));
  if (input.seed !== undefined) form.append("seed", String(input.seed));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), dependencies.timeoutMs ?? 60_000);
  try {
    const response = await (dependencies.fetchImpl ?? fetch)(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${FLUX_MODEL}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new Error(`Cloudflare FLUX request failed (${response.status}): ${detail}`);
    }
    const payload = fluxResponseSchema.parse(await response.json());
    const binary = Uint8Array.from(Buffer.from(payload.image, "base64"));
    if (binary.length === 0) throw new Error("Cloudflare FLUX returned an empty image.");
    return binary;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Cloudflare FLUX request timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
