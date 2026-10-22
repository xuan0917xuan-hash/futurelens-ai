import { describe, expect, it } from "vitest";

import {
  buildDesignBrief,
  conceptPrompt,
  hasCompleteConceptSet,
  hasReachedFeedbackThreshold,
  isRetryableGenerationStatus,
} from "@/server/workflow";
import { storeGeneratedImage } from "@/server/storage";

describe("consultation generation workflow", () => {
  it("consolidates resident requests into one brief", () => {
    const brief = buildDesignBrief([
      { body: "More shade" },
      { body: "Safer paths" },
    ]);
    expect(brief).toContain("More shade | Safer paths");
    expect(conceptPrompt(brief, 1)).toContain("child-friendly");
  });

  it("only considers a complete draft image set publishable", () => {
    expect(hasCompleteConceptSet([
      { status: "draft", image_storage_key: "one.jpg" },
      { status: "draft", image_storage_key: "two.jpg" },
    ], 2)).toBe(true);
    expect(hasCompleteConceptSet([
      { status: "draft", image_storage_key: "one.jpg" },
    ], 2)).toBe(false);
    expect(hasCompleteConceptSet([
      { status: "published", image_storage_key: "one.jpg" },
    ], 1)).toBe(false);
  });

  it("gates preparation at 15 submissions and allows only failed jobs to retry", () => {
    expect(hasReachedFeedbackThreshold(14)).toBe(false);
    expect(hasReachedFeedbackThreshold(15)).toBe(true);
    expect(isRetryableGenerationStatus("failed")).toBe(true);
    expect(isRetryableGenerationStatus("completed")).toBe(false);
  });

  it("fails loudly when mocked object storage rejects an image", async () => {
    const upload = async () => ({ error: { message: "storage unavailable" } });
    await expect(storeGeneratedImage(
      { from: () => ({ upload }) },
      "park-concepts",
      "consultation/job/1.jpg",
      new Uint8Array([1]),
    )).rejects.toThrow("storage unavailable");
  });
});
