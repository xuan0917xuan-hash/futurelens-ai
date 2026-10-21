import { useSyncExternalStore } from "react";
import conceptA from "@/assets/concept-a.jpg";
import conceptB from "@/assets/concept-b.jpg";
import conceptC from "@/assets/concept-c.jpg";

export type ConceptId = "A" | "B" | "C";

export const CONCEPTS: {
  id: ConceptId;
  name: string;
  tagline: string;
  description: string;
  image: string;
  features: string[];
  scores: { green: number; seating: number; family: number; access: number };
  compare: { green: string; seating: string; family: string; access: string };
}[] = [
  {
    id: "A",
    name: "Green Retreat",
    tagline: "Shade, canopy & calm",
    description: "A dense tree canopy with shaded timber pergolas and quiet seating nooks for cooler, calmer days outdoors.",
    image: conceptA,
    features: ["40+ new shade trees", "Timber pergola seating", "Native fern gardens", "Boardwalk path"],
    scores: { green: 5, seating: 5, family: 2, access: 3 },
    compare: {
      green: "Highest canopy cover; native planting beds",
      seating: "Shaded pergola benches throughout",
      family: "Open lawn only, no play equipment",
      access: "Level boardwalk; some narrow sections",
    },
  },
  {
    id: "B",
    name: "Family Park",
    tagline: "Play, picnic & gather",
    description: "A natural-timber playground, picnic lawns and family activity zones that bring neighbours together.",
    image: conceptB,
    features: ["Natural play structure", "Picnic lawn", "Covered family shelter", "Loop walking path"],
    scores: { green: 3, seating: 3, family: 5, access: 3 },
    compare: {
      green: "Moderate trees around play zones",
      seating: "Picnic tables and shelter seating",
      family: "Full playground, picnic & activity areas",
      access: "Paved loop; soft-fall play surfaces",
    },
  },
  {
    id: "C",
    name: "Inclusive Garden",
    tagline: "Accessible for everyone",
    description: "Gentle ramps, wide smooth paths and raised planters create a relaxing garden that everyone can enjoy.",
    image: conceptC,
    features: ["Step-free wide paths", "Handrails & gentle ramps", "Raised sensory planters", "Rest benches every 30m"],
    scores: { green: 4, seating: 4, family: 3, access: 5 },
    compare: {
      green: "Flowering raised beds and street trees",
      seating: "Benches with arm rests at regular intervals",
      family: "Sensory garden suitable for all ages",
      access: "Fully step-free with handrails",
    },
  },
];

export const NEEDS = [
  "More shaded seating",
  "More trees and green spaces",
  "Safer walking paths",
  "Child-friendly facilities",
  "Better accessibility",
  "Relaxation areas",
];

/** Demonstration voting baseline — not real community data. */
export const SAMPLE_VOTES: Record<ConceptId, number> = { A: 142, B: 118, C: 96 };

export const SAMPLE_REQUESTS = [
  { need: "More shaded seating", count: 87 },
  { need: "More trees and green spaces", count: 74 },
  { need: "Safer walking paths", count: 61 },
  { need: "Better accessibility", count: 48 },
  { need: "Child-friendly facilities", count: 42 },
  { need: "Relaxation areas", count: 33 },
];

export const SAMPLE_COMMENTS = [
  { concept: "A" as ConceptId, text: "It gets far too hot in summer — we need proper shade near the benches." },
  { concept: "C" as ConceptId, text: "My mother uses a walker. The current path is cracked and unsafe for her." },
  { concept: "B" as ConceptId, text: "Kids have nowhere to play nearby. A playground would be a huge help." },
  { concept: "A" as ConceptId, text: "Please keep the mature trees. More planting would make it feel calmer." },
  { concept: "C" as ConceptId, text: "Lighting along the path at night would make me feel safer walking home." },
];

export const SAMPLE_CONCERNS = [
  "Night-time lighting & safety",
  "Ongoing maintenance costs",
  "Noise near homes from play areas",
  "Construction disruption",
];

/** Adds a session vote to the demo baseline. */
export function tallyVotes(sessionVote: ConceptId | null): Record<ConceptId, number> {
  const t = { ...SAMPLE_VOTES };
  if (sessionVote) t[sessionVote] += 1;
  return t;
}

export function topConcept(votes: Record<ConceptId, number>): ConceptId {
  return (Object.keys(votes) as ConceptId[]).reduce((a, b) => (votes[b] > votes[a] ? b : a));
}

// ---- Session store (sessionStorage) ----
type State = {
  photo: string | null;
  description: string;
  needs: string[];
  selected: ConceptId | null;
  vote: { concept: ConceptId; reason: string } | null;
};
const KEY = "futurelens-session";
const initial: State = { photo: null, description: "", needs: [], selected: null, vote: null };
let state: State = initial;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) state = { ...initial, ...JSON.parse(raw) };
  } catch {}
}

export function setSession(patch: Partial<State>) {
  load();
  state = { ...state, ...patch };
  try {
    // Uploaded photo data URLs can be large; skip persisting them if storage fails.
    sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    sessionStorage.setItem(KEY, JSON.stringify({ ...state, photo: null }));
  }
  listeners.forEach((l) => l());
}

export function useSession(): State {
  return useSyncExternalStore(
    (cb) => {
      load();
      listeners.add(cb);
      cb();
      return () => listeners.delete(cb);
    },
    () => state,
    () => initial,
  );
}

export function conceptById(id: ConceptId) {
  return CONCEPTS.find((c) => c.id === id)!;
}
