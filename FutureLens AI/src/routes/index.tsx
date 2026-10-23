import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Eye, MessageSquareHeart, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import hero from "@/assets/hero-park.jpg";
import { CONCEPTS } from "@/lib/futurelens";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FutureLens AI — See the Future. Shape Your Community." },
      { name: "description", content: "Help redesign your neighbourhood park: explore design concepts, compare options and vote." },
      { property: "og:title", content: "FutureLens AI — See the Future. Shape Your Community." },
      { property: "og:description", content: "Help redesign your neighbourhood park: explore design concepts, compare options and vote." },
    ],
  }),
  component: Index,
});

const BENEFITS = [
  { icon: Eye, title: "Visualise Your Ideas", text: "See what your park could become through clear, side-by-side design concepts." },
  { icon: MessageSquareHeart, title: "Share Your Voice", text: "Vote for your favourite concept and tell planners what matters to you." },
  { icon: Sprout, title: "Shape Better Communities", text: "Your feedback helps developers build greener, safer, more inclusive spaces." },
];

const STEPS = ["Describe your space", "Explore AI concepts", "Compare options", "Vote & give feedback"];

function Index() {
  return (
    <>
      <section className="relative isolate -mt-16 flex min-h-[92vh] items-end overflow-hidden">
        <img src={hero} alt="Community park with winding path and benches at sunset" width={1920} height={1088} className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-hero" />
        <div className="mx-auto w-full max-w-7xl px-5 pb-20 pt-40 lg:px-8">
          <div className="max-w-3xl text-charcoal-foreground animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-charcoal-foreground/30 bg-charcoal-foreground/10 px-4 py-1.5 text-sm backdrop-blur-md">
              <Sprout className="h-4 w-4" /> Community design, reimagined
            </span>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.02] md:text-7xl">
              See the Future.
              <br />
              Shape Your Community.
            </h1>
            <p className="mt-6 max-w-xl text-lg opacity-90 md:text-xl">
              Share what your neighbourhood park needs, explore design concepts, and vote for the future you want to see.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="lg">
                <Link to="/describe">Start Designing <ArrowRight /></Link>
              </Button>
              <Button asChild variant="glass" size="lg">
                <Link to="/vote">Voting</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
        <div className="mb-14 max-w-2xl">
          <p className="eyebrow">Why FutureLens</p>
          <h2 className="mt-3 text-4xl font-semibold md:text-5xl">Every resident deserves a say in public space.</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {BENEFITS.map((b, i) => (
            <div key={b.title} className="group rounded-3xl border border-border bg-card p-8 shadow-soft transition-all hover:-translate-y-1 hover:shadow-elegant">
              <div className="flex items-center justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-primary">
                  <b.icon className="h-6 w-6" />
                </span>
                <span className="font-display text-4xl text-border">0{i + 1}</span>
              </div>
              <h3 className="mt-8 text-2xl font-semibold">{b.title}</h3>
              <p className="mt-3 text-muted-foreground">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid gap-10 overflow-hidden rounded-[2rem] bg-charcoal p-8 text-charcoal-foreground md:p-14 lg:grid-cols-2">
          <div>
            <p className="eyebrow text-sage">How it works</p>
            <h2 className="mt-3 text-4xl font-semibold">From idea to influence in four steps.</h2>
            <ol className="mt-10 space-y-5">
              {STEPS.map((s, i) => (
                <li key={s} className="flex items-center gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-primary font-semibold">{i + 1}</span>
                  <span className="text-lg">{s}</span>
                </li>
              ))}
            </ol>
            <Button asChild variant="hero" size="lg" className="mt-10">
              <Link to="/describe">Get started <ArrowRight /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {CONCEPTS.map((c, i) => (
              <img key={c.id} src={c.image} alt={c.name} loading="lazy" width={1024} height={768}
                className={`h-full w-full rounded-2xl object-cover ${i === 0 ? "col-span-2 aspect-[16/9]" : "aspect-square"}`} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
