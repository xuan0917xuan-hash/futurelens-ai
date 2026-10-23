import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { Accessibility, ArrowLeft, ArrowRight, Armchair, Baby, Check, Trees } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoBadge, PageHeader } from "@/components/SiteHeader";
import { CONCEPTS, setSession, useSession } from "@/lib/futurelens";

export const Route = createFileRoute("/compare")({
  beforeLoad: async () => {
    const auth = await getCurrentUser();
    if (!auth.user || auth.user.role !== "resident") throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "Compare Designs — FutureLens AI" },
      { name: "description", content: "Compare green space, seating, family facilities and accessibility across park concepts." },
      { property: "og:title", content: "Compare Designs — FutureLens AI" },
      { property: "og:description", content: "Compare park design concepts side by side." },
    ],
  }),
  component: Compare,
});

const ROWS = [
  { key: "green", label: "Green space", icon: Trees },
  { key: "seating", label: "Seating", icon: Armchair },
  { key: "family", label: "Family facilities", icon: Baby },
  { key: "access", label: "Accessibility", icon: Accessibility },
] as const;

function Score({ n }: { n: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`h-1.5 w-6 rounded-full ${i <= n ? "bg-primary" : "bg-border"}`} />
      ))}
    </div>
  );
}

function Compare() {
  const s = useSession();
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-7xl px-5 lg:px-8">
      <PageHeader step="Step 3 of 4" title="Compare designs" subtitle="See how each concept performs on what matters most, then pick your preferred option." />
      <div className="mb-6 flex justify-center"><DemoBadge>Illustrative ratings</DemoBadge></div>
      <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-soft">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr>
              <th className="w-48 p-6" />
              {CONCEPTS.map((c) => (
                <th key={c.id} className={`p-6 align-top ${s.selected === c.id ? "bg-accent" : ""}`}>
                  <img src={c.image} alt={c.name} loading="lazy" className="aspect-[16/10] w-full rounded-2xl object-cover" />
                  <p className="eyebrow mt-4">Concept {c.id}</p>
                  <p className="font-display text-2xl font-semibold">{c.name}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => {
              const best = Math.max(...CONCEPTS.map((c) => c.scores[r.key]));
              return (
                <tr key={r.key} className="border-t border-border">
                  <td className="p-6 font-semibold"><span className="flex items-center gap-2"><r.icon className="h-5 w-5 text-primary" /> {r.label}</span></td>
                  {CONCEPTS.map((c) => (
                    <td key={c.id} className={`p-6 align-top text-sm ${s.selected === c.id ? "bg-accent" : ""}`}>
                      <div className="flex items-center gap-2">
                        <Score n={c.scores[r.key]} />
                        {c.scores[r.key] === best && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">Best</span>}
                      </div>
                      <p className="mt-2 text-muted-foreground">{c.compare[r.key]}</p>
                    </td>
                  ))}
                </tr>
              );
            })}
            <tr className="border-t border-border">
              <td className="p-6 font-semibold">Key features</td>
              {CONCEPTS.map((c) => (
                <td key={c.id} className={`p-6 align-top text-sm ${s.selected === c.id ? "bg-accent" : ""}`}>
                  <ul className="space-y-1.5">{c.features.map((f) => <li key={f}>• {f}</li>)}</ul>
                </td>
              ))}
            </tr>
            <tr className="border-t border-border">
              <td className="p-6" />
              {CONCEPTS.map((c) => (
                <td key={c.id} className={`p-6 ${s.selected === c.id ? "bg-accent" : ""}`}>
                  <Button className="w-full" variant={s.selected === c.id ? "default" : "outline"} onClick={() => setSession({ selected: c.id })}>
                    {s.selected === c.id ? <><Check /> Preferred</> : "Choose as preferred"}
                  </Button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-12 flex flex-wrap justify-between gap-3">
        <Button asChild variant="ghost" size="lg"><Link to="/concepts"><ArrowLeft /> Back to concepts</Link></Button>
        <Button variant="hero" size="lg" onClick={() => navigate({ to: "/vote" })}>Continue to vote <ArrowRight /></Button>
      </div>
    </div>
  );
}
