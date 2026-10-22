export type AppRole = "resident" | "developer";

export function normalizeUsername(username: string): string {
  const normalized = username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,32}$/.test(normalized)) {
    throw new Error("Username must be 3-32 characters using lowercase letters, numbers, or underscores.");
  }
  return normalized;
}

export function assertRole(actual: AppRole, required: AppRole): void {
  if (actual !== required) throw new Error("You are not authorized for this action.");
}
