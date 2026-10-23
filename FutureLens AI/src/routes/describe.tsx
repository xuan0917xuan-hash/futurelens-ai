import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/SiteHeader";
import { DEMO_CONSULTATION_ID, DEMO_SOURCE_IMAGE_IDS, setSession, useSession } from "@/lib/futurelens";
import sample from "@/assets/sample-park.jpg";
import hero from "@/assets/hero-park.jpg";
import { toast } from "sonner";
import { getCurrentUser } from "@/server/auth";
import { submitImprovementFeedback } from "@/server/persistence";
import { generatePersonalConcept, getMyPersonalConcept } from "@/server/personal-generation";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/describe")({
  beforeLoad: async () => {
    const auth = await getCurrentUser();
    if (!auth.user || auth.user.role !== "resident") throw redirect({ to: "/login" });
  },
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
  const [personalImage, setPersonalImage] = useState<string | null>(null);
  const [personalLoading, setPersonalLoading] = useState(false);
  const [personalLoadError, setPersonalLoadError] = useState<string | null>(null);

  useEffect(() => {
    void getCurrentUser().then((auth) => {
      if (auth.user) {
        void getMyPersonalConcept({ data: { consultationId: DEMO_CONSULTATION_ID } })
          .then((concept) => {
            if (concept?.imageUrl) setPersonalImage(concept.imageUrl);
          })
          .catch((error) => setPersonalLoadError(error instanceof Error ? error.message : "Unable to load your generated image."));
      }
    });
  }, []);

  const generate = async () => {
    if (!s.photo) { toast.error("Please choose a park photo first."); return; }
    if (!s.description.trim()) { toast.error("Tell us at least one thing you'd like to improve."); return; }
    setPersonalLoading(true);
    try {
      const auth = await getCurrentUser();
      if (!auth.configured) {
        toast.error("Supabase is not configured. Check that .env is in the FutureLens AI folder, then restart npm run dev.");
        return;
      }
      if (!auth.user) {
        toast.error("Please sign in as a resident before generating your image.");
        navigate({ to: "/login" });
        return;
      }

      const sourceImageId = s.photo === sample ? DEMO_SOURCE_IMAGE_IDS.mapleStreet : DEMO_SOURCE_IMAGE_IDS.riverside;
      let submission: Awaited<ReturnType<typeof submitImprovementFeedback>> | null = null;
      try {
        submission = await submitImprovementFeedback({
          data: {
            consultationId: DEMO_CONSULTATION_ID,
            sourceImageId,
            body: s.description,
          },
        });
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("already submitted")) {
          toast.info("Your personal image will still be generated. Community feedback was not added: "
            + (error instanceof Error ? error.message : "unknown error"));
        }
      }

      await generatePersonalConcept({
        data: {
          consultationId: DEMO_CONSULTATION_ID,
          sourceImageId,
          prompt: s.description,
        },
      });
      const concept = await getMyPersonalConcept({ data: { consultationId: DEMO_CONSULTATION_ID } });
      if (!concept?.imageUrl) throw new Error("Your image was generated, but could not be loaded. Please refresh and try again.");
      setPersonalImage(concept.imageUrl);
      toast.success("Your one personal FLUX design image is ready.");

      if (submission?.generation?.ok) {
        toast.success("The community threshold was reached and voting concepts are ready.");
      } else if (submission?.generation?.error) {
        toast.error(`Your feedback was saved, but automatic concept generation failed: ${submission.generation.error}`);
      } else if (submission) {
        toast.success("Your feedback was added to the community brief.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to generate your personal design image.");
    } finally {
      setPersonalLoading(false);
    }
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
          <Button variant="hero" size="lg" className="w-full" onClick={generate} disabled={personalLoading || Boolean(personalImage)}>
            <Sparkles /> {personalLoading ? "Generating your image…" : personalImage ? "Your image has been generated" : "Generate my design image"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">Each resident can generate one private FLUX image from their requests during the design stage.</p>
          {personalImage && <div className="overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-soft"><img src={personalImage} alt="Your generated park design" className="aspect-[4/3] w-full object-cover" /><p className="p-3 text-center text-sm font-medium">Your personal design image</p><Button asChild variant="hero" className="m-4 w-[calc(100%-2rem)]"><Link to="/vote">Continue to concept voting</Link></Button></div>}
          {personalLoadError && <p className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{personalLoadError}</p>}
        </section>
      </div>
    </div>
  );
}
