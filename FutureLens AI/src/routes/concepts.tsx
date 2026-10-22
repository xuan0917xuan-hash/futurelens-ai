import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DemoBadge, PageHeader } from "@/components/SiteHeader";
import { CONCEPTS, DEMO_CONSULTATION_ID, setSession, useSession } from "@/lib/futurelens";
import { getCurrentUser } from "@/server/auth";
import { getPublishedConcepts, type PublishedConcept } from "@/server/published-concepts";

export const Route = createFileRoute("/concepts")({
  head: () => ({
    meta: [
      { title: "Design Concepts — FutureLens AI" },
      { name: "description", content: "Explore three park design concepts: Green Retreat, Family Park and Inclusive Garden." },
      { property: "og:title", content: "Design Concepts — FutureLens AI" },
      { property: "og:description", content: "Explore three park design concepts for your community." },
    ],
  }),
  component: Concepts,
});

const TONES = ["bg-primary text-primary-foreground", "bg-sage text-charcoal", "bg-charcoal text-charcoal-foreground"];

function Concepts() {
  const s = useSession();
  const navigate = useNavigate();
  const [published, setPublished] = useState<PublishedConcept[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    void getCurrentUser().then(async (auth) => {
      if (!auth.user) return;
      setLoading(true);
      try {
        const concepts = await getPublishedConcepts({ data: { consultationId: DEMO_CONSULTATION_ID } });
        if (active && concepts.length > 0) setPublished(concepts);
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  const live = published.length > 0;
  return (
    <div className="mx-auto max-w-7xl px-5 lg:px-8">
      <PageHeader step="Step 2 of 4" title="Your design concepts" subtitle={live ? "Representative proposals shaped from the combined community brief." : "Three directions for your park. Select one to explore, then compare them side by side."} />
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <DemoBadge>{live ? "Community-generated concepts" : "Demonstration concepts"}</DemoBadge>
        <p className="max-w-xl text-sm text-muted-foreground">{live ? "Generated from the combined requests submitted by residents." : "These are prepared sample concepts for illustration — not verified AI-generated construction plans."}</p>
      </div>
      {loading && <p className="mb-6 text-center text-sm text-muted-foreground">Checking for published community concepts…</p>}
      <div className="grid gap-6 lg:grid-cols-3">
        {(live ? published : CONCEPTS).map((c, i) => {
          const id = c.id;
          const on = s.selected === id;
          return (
            <article key={id} className={`flex flex-col overflow-hidden rounded-3xl border bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-elegant ${on ? "border-primary ring-2 ring-primary" : "border-border"}`}>
              <div className="relative">
                <img src={live && c.imageUrl ? c.imageUrl : !live ? c.image : CONCEPTS[i % CONCEPTS.length].image} alt={c.name} loading="lazy" width={1024} height={768} className="aspect-[4/3] w-full object-cover" />
                <span className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-bold ${TONES[i % TONES.length]}`}>Concept {live ? i + 1 : c.id}</span>
              </div>
              <div className="flex flex-1 flex-col p-7">
                <p className="eyebrow">{c.tagline}</p>
                <h2 className="mt-2 text-3xl font-semibold">{c.name}</h2>
                <p className="mt-3 text-muted-foreground">{c.description}</p>
                <ul className="mt-6 space-y-2.5">
                  {c.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-primary"><Check className="h-3 w-3" /></span>{f}
                    </li>
                  ))}
                </ul>
                <Button className="mt-8" variant={on ? "default" : "outline"} size="lg" onClick={() => setSession({ selected: c.id })}>
                  {on ? <><Check /> Selected</> : "Select this concept"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      <div className="mt-12 flex flex-wrap justify-between gap-3">
        <Button asChild variant="ghost" size="lg"><Link to="/describe"><ArrowLeft /> Back</Link></Button>
        <Button variant="hero" size="lg" onClick={() => navigate({ to: "/compare" })}>Compare designs <ArrowRight /></Button>
      </div>
    </div>
  );
}
