import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/SiteHeader";
import { NEEDS, setSession, useSession } from "@/lib/futurelens";
import sample from "@/assets/sample-park.jpg";
import hero from "@/assets/hero-park.jpg";
import { toast } from "sonner";

export const Route = createFileRoute("/describe")({
  head: () => ({
    meta: [
      { title: "Describe Your Space — FutureLens AI" },
      { name: "description", content: "Choose a park photo and tell us what you'd like to improve." },
      { property: "og:title", content: "Describe Your Space — FutureLens AI" },
      { property: "og:description", content: "Choose a park photo and tell us what you'd like to improve." },
    ],
  }),
  component: Describe,
});

const SAMPLES = [
  { src: sample, label: "Maple Street Park" },
  { src: hero, label: "Riverside Green" },
];

function Describe() {
  const s = useSession();
  const navigate = useNavigate();

  const toggle = (n: string) =>
    setSession({ needs: s.needs.includes(n) ? s.needs.filter((x) => x !== n) : [...s.needs, n] });

  const generate = () => {
    if (!s.photo) { toast.error("Please choose a park photo first."); return; }
    if (s.needs.length === 0 && !s.description.trim()) { toast.error("Tell us at least one thing you'd like to improve."); return; }
    navigate({ to: "/concepts" });
  };

  return (
    <div className="mx-auto max-w-6xl px-5 lg:px-8">
      <PageHeader step="Step 1 of 4" title="Describe your space" subtitle="Pick a park photo and tell us what would make it better for your community." />
      <div className="grid gap-8 lg:grid-cols-5">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-soft lg:col-span-3">
          <h2 className="text-xl font-semibold">1. Choose an existing park photo</h2>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {SAMPLES.map((p) => (
              <button key={p.label} onClick={() => setSession({ photo: p.src })}
                className={`group relative overflow-hidden rounded-2xl ring-2 transition ${s.photo === p.src ? "ring-primary" : "ring-transparent hover:ring-sage"}`}>
                <img src={p.src} alt={p.label} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-hero px-2 py-1.5 text-left text-xs font-medium text-charcoal-foreground">{p.label}</span>
                {s.photo === p.src && <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-4 w-4" /></span>}
              </button>
            ))}
          </div>
          <div className="mt-6 overflow-hidden rounded-2xl bg-muted">
            {s.photo ? (
              <img src={s.photo} alt="Selected park" className="aspect-[16/9] w-full object-cover" />
            ) : (
              <div className="grid aspect-[16/9] place-items-center text-muted-foreground">Choose a park photo to preview it here</div>
            )}
          </div>
        </section>

        <section className="space-y-6 lg:col-span-2">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
            <h2 className="text-xl font-semibold">2. What should improve?</h2>
            <textarea value={s.description} onChange={(e) => setSession({ description: e.target.value })} rows={4}
              placeholder="e.g. There's little shade, the path is cracked and kids have nowhere to play…"
              className="mt-4 w-full resize-none rounded-2xl border border-input bg-background p-4 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
            <h2 className="text-xl font-semibold">3. Select your needs</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {NEEDS.map((n) => {
                const on = s.needs.includes(n);
                return (
                  <button key={n} onClick={() => toggle(n)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${on ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background hover:border-primary hover:text-primary"}`}>
                    {on && <Check className="h-3.5 w-3.5" />} {n}
                  </button>
                );
              })}
            </div>
          </div>
          <Button variant="hero" size="lg" className="w-full" onClick={generate}>
            <Sparkles /> Generate Design Concepts
          </Button>
          <p className="text-center text-xs text-muted-foreground">This prototype shows prepared sample concepts — no real AI image generation runs.</p>
        </section>
      </div>
    </div>
  );
}
