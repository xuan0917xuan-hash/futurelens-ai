import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BarChart3, Check, PartyPopper } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DemoBadge, PageHeader } from "@/components/SiteHeader";
import { CONCEPTS, conceptById, setSession, tallyVotes, useSession, type ConceptId } from "@/lib/futurelens";

export const Route = createFileRoute("/vote")({
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
  const [reason, setReason] = useState("");
  const current = choice ?? s.selected;
  const votes = tallyVotes(s.vote?.concept ?? null);
  const total = votes.A + votes.B + votes.C;

  const submit = () => {
    if (s.vote) { toast.info("You've already voted in this session."); return; }
    if (!current) { toast.error("Please choose a concept to vote for."); return; }
    setSession({ vote: { concept: current, reason: reason.trim() } });
    toast.success(`Thanks! Your vote for ${conceptById(current).name} was recorded.`);
  };

  return (
    <div className="mx-auto max-w-6xl px-5 lg:px-8">
      <PageHeader step="Step 4 of 4" title="Cast your vote" subtitle="Choose the concept you'd most like to see built, and tell us why." />
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {s.vote ? (
            <div className="rounded-3xl bg-gradient-primary p-10 text-center text-primary-foreground shadow-elegant animate-fade-up">
              <PartyPopper className="mx-auto h-12 w-12" />
              <h2 className="mt-4 text-3xl font-semibold">Thank you for voting!</h2>
              <p className="mt-3 opacity-90">You voted for <b>Concept {s.vote.concept}: {conceptById(s.vote.concept).name}</b>.</p>
              {s.vote.reason && <p className="mx-auto mt-4 max-w-md rounded-2xl bg-primary-foreground/10 p-4 italic">“{s.vote.reason}”</p>}
              <p className="mt-6 text-sm opacity-80">One vote per browser session. Your vote is stored only in this browser as demonstration data.</p>
              <Button asChild variant="glass" size="lg" className="mt-6"><Link to="/dashboard"><BarChart3 /> View dashboard</Link></Button>
            </div>
          ) : (
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <div className="space-y-3">
                {CONCEPTS.map((c) => (
                  <button key={c.id} onClick={() => setChoice(c.id)}
                    className={`flex w-full items-center gap-4 rounded-2xl border-2 p-3 text-left transition ${current === c.id ? "border-primary bg-accent" : "border-border hover:border-sage"}`}>
                    <img src={c.image} alt="" loading="lazy" className="h-20 w-28 rounded-xl object-cover" />
                    <div className="flex-1">
                      <p className="eyebrow">Concept {c.id}</p>
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
          )}
          <Button asChild variant="ghost" size="lg" className="mt-6"><Link to="/compare"><ArrowLeft /> Back to compare</Link></Button>
        </div>

        <aside className="h-fit rounded-3xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Current results</h2>
            <DemoBadge>Sample</DemoBadge>
          </div>
          <div className="mt-6 space-y-5">
            {CONCEPTS.map((c) => {
              const pct = Math.round((votes[c.id] / total) * 100);
              return (
                <div key={c.id}>
                  <div className="flex justify-between text-sm"><span className="font-medium">{c.name}</span><span className="text-muted-foreground">{pct}% · {votes[c.id]}</span></div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-primary transition-all" style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-xs text-muted-foreground">Results are demonstration data (no permanent storage is configured). Your session vote is added on top.</p>
        </aside>
      </div>
    </div>
  );
}
