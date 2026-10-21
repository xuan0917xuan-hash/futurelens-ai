import { describe, expect, it } from "vitest";
import { tallyVotes, topConcept, SAMPLE_VOTES } from "@/lib/futurelens";

describe("voting", () => {
  it("adds exactly one session vote to the chosen concept", () => {
    expect(tallyVotes("C").C).toBe(SAMPLE_VOTES.C + 1);
    expect(tallyVotes("C").A).toBe(SAMPLE_VOTES.A);
  });
  it("picks the concept with the most votes", () => {
    expect(topConcept({ A: 1, B: 5, C: 2 })).toBe("B");
  });
});
