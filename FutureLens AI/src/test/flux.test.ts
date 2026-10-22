import { describe, expect, it, vi } from "vitest";

import { generateFluxImage } from "@/server/flux";

describe("Cloudflare FLUX client", () => {
  it("sends the source image as multipart input and decodes the response", async () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = "account";
    process.env.CLOUDFLARE_API_TOKEN = "secret";
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      JSON.stringify({ image: Buffer.from("image-bytes").toString("base64") }),
      { status: 200, headers: { "content-type": "application/json" } },
    ));

    const result = await generateFluxImage(
      { prompt: "preserve this park", sourceImage: new Blob(["park"]) },
      { fetchImpl },
    );

    expect(new TextDecoder().decode(result)).toBe("image-bytes");
    const request = fetchImpl.mock.calls[0][1]!;
    expect(request.headers).toEqual({ Authorization: "Bearer secret" });
    expect(request.body).toBeInstanceOf(FormData);
    expect((request.body as FormData).get("input_image_0")).toBeInstanceOf(File);
  });

  it("reports provider errors and timeouts", async () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = "account";
    process.env.CLOUDFLARE_API_TOKEN = "secret";
    await expect(generateFluxImage(
      { prompt: "park", sourceImage: new Blob(["park"]) },
      { fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(new Response("bad", { status: 502 })) },
    )).rejects.toThrow("502");
  });
});
