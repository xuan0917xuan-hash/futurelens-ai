import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  CONCEPTS,
  SAMPLE_VOTES,
  setSession,
  tallyVotes,
  topConcept,
  useSession,
} from "@/lib/futurelens";

describe("FutureLens demo state", () => {
  it("exposes the three park concepts used throughout the flow", () => {
    expect(CONCEPTS.map((concept) => concept.id)).toEqual(["A", "B", "C"]);
    expect(CONCEPTS.every((concept) => concept.image.length > 0)).toBe(true);
  });

  it("updates the selected park in session state", () => {
    sessionStorage.clear();
    const { result } = renderHook(() => useSession());

    act(() => {
      setSession({
        photo: CONCEPTS.find((concept) => concept.id === "B")!.image,
      });
    });

    expect(result.current.photo).toBe(CONCEPTS.find((concept) => concept.id === "B")!.image);
  });

  it("adds exactly one session vote to the chosen concept", () => {
    expect(tallyVotes("C").C).toBe(SAMPLE_VOTES.C + 1);
    expect(tallyVotes("C").A).toBe(SAMPLE_VOTES.A);
  });

  it("does not change the baseline when there is no session vote", () => {
    expect(tallyVotes(null)).toEqual(SAMPLE_VOTES);
  });

  it("picks the concept with the most votes", () => {
    expect(topConcept({ A: 1, B: 5, C: 2 })).toBe("B");
  });
});
