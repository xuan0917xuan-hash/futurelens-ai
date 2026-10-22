import { describe, expect, it } from "vitest";

import { assertRole, normalizeUsername } from "@/server/authorization";
import { credentialsSchema, signupSchema } from "@/server/auth";
import { generationSchema, voteSchema } from "@/server/persistence";

describe("server authorization and validation", () => {
  it("normalizes valid usernames and rejects invalid usernames", () => {
    expect(normalizeUsername(" Resident_01 ")).toBe("resident_01");
    expect(() => normalizeUsername("bad username")).toThrow();
    expect(() => normalizeUsername("ab")).toThrow();
  });

  it("allows only the requested application role", () => {
    expect(() => assertRole("developer", "developer")).not.toThrow();
    expect(() => assertRole("resident", "developer")).toThrow("not authorized");
  });

  it("rejects invalid credentials and persistence identifiers", () => {
    expect(credentialsSchema.safeParse({ username: "ab", password: "short" }).success).toBe(false);
  });

  it("requires a valid email for resident registration", () => {
    const base = { username: "resident_1", password: "password123" };
    expect(signupSchema.safeParse(base).success).toBe(false);
    expect(signupSchema.safeParse({ ...base, email: "resident@example.com" }).success).toBe(true);
    expect(
      voteSchema.safeParse({
        consultationId: "not-a-uuid",
        conceptId: "not-a-uuid",
      }).success,
    ).toBe(false);
    expect(generationSchema.safeParse({
      consultationId: "00000000-0000-0000-0000-000000000001",
    }).success).toBe(true);
  });
});
