import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowLeft, BarChart3, Check, PartyPopper } from "lucide-react";
import { useState } from "react";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DemoBadge, PageHeader } from "@/components/SiteHeader";
import {
  CONCEPTS,
  conceptById,
  DEMO_CONSULTATION_ID,
  DEMO_OFFICIAL_CONCEPT_IDS,
  setSession,
  tallyVotes,
  useSession,
  type ConceptId,
} from "@/lib/futurelens";
import { getCurrentUser } from "@/server/auth";
import { submitVote } from "@/server/persistence";
import { getConsultationVotingState, getPublishedConcepts, type PublishedConcept } from "@/server/published-concepts";

export const Route = createFileRoute("/vote")({
  beforeLoad: async () => {
    const auth = await getCurrentUser();
    if (!auth.user || auth.user.role !== "resident") throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "Community Voting — FutureLens AI" },
      { name: "description", content: "Vote for your favourite park design concept and tell us why." },
      { property: "og:title", content: "Community Voting — FutureLens AI" },
      { property: "og:description", content: "Vote for your favourite park design concept." },
    ],
  }),
  component: Vote,
});

function Vote() {
  const s = useSession();
  const [choice, setChoice] = useState<ConceptId | null>(null);
  const [published, setPublished] = useState<PublishedConcept[]>([]);
  const [votingOpen, setVotingOpen] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Checking whether voting is open…");
  const [voted, setVoted] = useState(false);
  const [reason, setReason] = useState("");
  const current = choice ?? s.selected;
  const live = votingOpen && !usingFallback;
  const liveChoice = live ? (choice ?? s.selected) : null;
  const selectedLiveConcept = published.find((concept) => concept.id === liveChoice);
  const votes = tallyVotes(s.vote?.concept ?? null);
  const total = votes.A + votes.B + votes.C;

  useEffect(() => {
    void getCurrentUser().then(async (auth) => {
      if (!auth.user) {
        setStatusMessage(auth.configured ? "Please sign in as a resident to check the consultation voting status." : "Voting is unavailable until Supabase is configured.");
        return;
      }
      try {
        const [state, concepts] = await Promise.all([
          getConsultationVotingState({ data: { consultationId: DEMO_CONSULTATION_ID } }),
          getPublishedConcepts({ data: { consultationId: DEMO_CONSULTATION_ID } }),
        ]);
        const complete = state.phase === "voting_open"
          && concepts.length === 3
          && concepts.every((concept) => Boolean(concept.imageUrl));
        const generationInProgress = state.generationStatus === "queued" || state.generationStatus === "running";
        const fallback = !complete
          && state.phase !== "closed"
          && state.feedbackCount >= state.feedbackThreshold
          && !generationInProgress;
        setPublished(fallback ? CONCEPTS.map((concept) => ({
          id: DEMO_OFFICIAL_CONCEPT_IDS[concept.id],
          name: concept.name,
          tagline: concept.tagline,
          description: concept.description,
          imageUrl: concept.image,
          features: concept.features,
        })) : concepts);
        setUsingFallback(fallback);
        setVotingOpen(complete || fallback);
        setStatusMessage(
          complete || fallback
            ? ""
            : state.feedbackCount < state.feedbackThreshold
              ? `Voting is not yet open. ${state.feedbackThreshold - state.feedbackCount} more unique resident submissions are needed before concept generation begins.`
              : "Voting is not yet open. The three community concept images are still being generated.",
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to load published concepts.");
      }
    });
  }, []);

  const submit = async () => {
    if (s.vote || voted) { toast.info("You've already voted in this session."); return; }
    if (!current) { toast.error("Please choose a concept to vote for."); return; }
    try {
      const auth = await getCurrentUser();
      if (auth.configured && !auth.user) {
        toast.error("Please sign in as a resident before voting.");
        return;
      }
      if (auth.configured && auth.user) {
        await submitVote({
          data: {
            consultationId: DEMO_CONSULTATION_ID,
            conceptId: live ? current : DEMO_OFFICIAL_CONCEPT_IDS[current as ConceptId],
            feedback: reason.trim() || undefined,
          },
        });
      }
      if (live) {
        setVoted(true);
        toast.success(`Thanks! Your vote for ${selectedLiveConcept?.name ?? "the selected concept"} was recorded.`);
      } else {
        setSession({ vote: { concept: current as ConceptId, reason: reason.trim() } });
        toast.success(`Thanks! Your vote for ${conceptById(current as ConceptId).name} was recorded.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to record your vote.");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-5 lg:px-8">
      <PageHeader step="Step 4 of 4" title="Cast your vote" subtitle="Choose the concept you'd most like to see built, and tell us why." />
      {!votingOpen && <div className="mb-8 rounded-3xl border border-border bg-card p-8 text-center shadow-soft"><h2 className="text-2xl font-semibold">Voting is not yet open</h2><p className="mx-auto mt-3 max-w-xl text-muted-foreground">{statusMessage}</p><Button asChild variant="hero" size="lg" className="mt-6"><Link to="/describe">Back to design stage</Link></Button></div>}
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {votingOpen && (s.vote || voted) ? (
            <div className="rounded-3xl bg-gradient-primary p-10 text-center text-primary-foreground shadow-elegant animate-fade-up">
              <PartyPopper className="mx-auto h-12 w-12" />
              <h2 className="mt-4 text-3xl font-semibold">Thank you for voting!</h2>
              <p className="mt-3 opacity-90">Your vote has been recorded for <b>{live ? selectedLiveConcept?.name ?? "the selected concept" : `Concept ${s.vote?.concept}: ${conceptById(s.vote?.concept ?? "A").name}`}</b>.</p>
              {s.vote?.reason && <p className="mx-auto mt-4 max-w-md rounded-2xl bg-primary-foreground/10 p-4 italic">“{s.vote.reason}”</p>}
              <p className="mt-6 text-sm opacity-80">{live ? "One vote per authenticated resident." : "One vote per browser session. Your vote is stored only in this browser as demonstration data."}</p>
              <Button asChild variant="glass" size="lg" className="mt-6"><Link to="/dashboard"><BarChart3 /> View dashboard</Link></Button>
            </div>
          ) : votingOpen ? (
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <div className="space-y-3">
                {(live ? published : CONCEPTS).map((c, index) => (
                  <button key={c.id} onClick={() => setChoice(c.id as ConceptId)}
                    className={`flex w-full items-center gap-4 rounded-2xl border-2 p-3 text-left transition ${current === c.id ? "border-primary bg-accent" : "border-border hover:border-sage"}`}>
                    <img src={live && c.imageUrl ? c.imageUrl : !live ? c.image : CONCEPTS[index % CONCEPTS.length].image} alt="" loading="lazy" className="h-20 w-28 rounded-xl object-cover" />
                    <div className="flex-1">
                      <p className="eyebrow">Concept {live ? index + 1 : c.id}</p>
                      <p className="font-display text-xl font-semibold">{c.name}</p>
                      <p className="text-sm text-muted-foreground">{c.tagline}</p>
                    </div>
                    <span className={`grid h-7 w-7 place-items-center rounded-full border-2 ${current === c.id ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>
                      {current === c.id && <Check className="h-4 w-4" />}
                    </span>
                  </button>
                ))}
              </div>
              <label className="mt-6 block text-sm font-semibold">Why do you prefer this design?</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} placeholder="Share what you like about it…"
                className="mt-2 w-full resize-none rounded-2xl border border-input bg-background p-4 text-sm outline-none focus:ring-2 focus:ring-ring" />
              <Button variant="hero" size="lg" className="mt-5 w-full" onClick={submit}>Submit my vote</Button>
            </div>
          ) : null}
          <Button asChild variant="ghost" size="lg" className="mt-6"><Link to="/compare"><ArrowLeft /> Back to compare</Link></Button>
        </div>

        <aside className="h-fit rounded-3xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Current results</h2>
            <DemoBadge>{live ? "Live voting" : "Waiting"}</DemoBadge>
          </div>
          <div className="mt-6 space-y-5">
            {live && published.map((c) => {
              const index = published.indexOf(c);
              const pct = Math.round((votes[c.id] / total) * 100);
              return (
                <div key={c.id}>
                  <div className="flex justify-between text-sm"><span className="font-medium">{c.name}</span><span className="text-muted-foreground">{pct}% · {votes[c.id]}</span></div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-primary transition-all" style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-xs text-muted-foreground">{live ? "Votes are stored for authenticated residents." : "Community concepts will appear here after generation is complete."}</p>
        </aside>
      </div>
    </div>
  );
}
