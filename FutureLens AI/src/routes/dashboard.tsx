import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, MessageSquare, Sparkles, Trophy, Users } from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DemoBadge } from "@/components/SiteHeader";
import { CONCEPTS, SAMPLE_COMMENTS, SAMPLE_CONCERNS, SAMPLE_REQUESTS, conceptById, tallyVotes, topConcept, useSession } from "@/lib/futurelens";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Developer Dashboard — FutureLens AI" },
      { name: "description", content: "Community preferences, top requests and concerns for park redevelopment (demonstration data)." },
      { property: "og:title", content: "Developer Dashboard — FutureLens AI" },
      { property: "og:description", content: "Community preferences and concerns at a glance." },
    ],
  }),
  component: Dashboard,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-5)"];

function Dashboard() {
  const s = useSession();
  const votes = tallyVotes(s.vote?.concept ?? null);
  const total = votes.A + votes.B + votes.C;
  const top = conceptById(topConcept(votes));
  const pie = CONCEPTS.map((c) => ({ name: c.name, value: votes[c.id] }));

  const stats = [
    { icon: Users, label: "Total votes", value: total },
    { icon: Trophy, label: "Leading concept", value: top.name },
    { icon: MessageSquare, label: "Comments", value: 214 },
    { icon: AlertTriangle, label: "Top request", value: "Shade" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-5 pt-12 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Developer dashboard</p>
          <h1 className="mt-2 text-4xl font-semibold md:text-5xl">Maple Street Park insights</h1>
        </div>
        <DemoBadge>All figures are demonstration data, not real community research</DemoBadge>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((st) => (
          <div key={st.label} className="rounded-3xl border border-border bg-card p-6 shadow-soft">
            <st.icon className="h-5 w-5 text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">{st.label}</p>
            <p className="mt-1 font-display text-3xl font-semibold">{st.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-xl font-semibold">Vote share</h2>
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pie} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={3} stroke="none">
                  {pie.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-2 text-sm">
            {CONCEPTS.map((c, i) => (
              <li key={c.id} className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: COLORS[i] }} />{c.name}</span>
                <span className="font-semibold">{Math.round((votes[c.id] / total) * 100)}%</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
          <h2 className="text-xl font-semibold">Most requested improvements</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <BarChart data={SAMPLE_REQUESTS} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="need" width={170} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 8, 8, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-3xl bg-charcoal p-8 text-charcoal-foreground">
        <div className="flex flex-wrap items-center gap-3">
          <Sparkles className="h-5 w-5 text-sage" />
          <h2 className="text-xl font-semibold">Community summary</h2>
          <DemoBadge>Sample AI-style summary · demonstration content</DemoBadge>
        </div>
        <p className="mt-4 max-w-3xl font-display text-2xl leading-snug">
          “Residents value shaded seating, more trees and safer walking paths. Several comments request improved accessibility and family-friendly facilities.”
        </p>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
          <h2 className="text-xl font-semibold">Sample resident comments</h2>
          <ul className="mt-4 divide-y divide-border">
            {SAMPLE_COMMENTS.map((c, i) => (
              <li key={i} className="flex gap-4 py-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-primary">{c.concept}</span>
                <p className="text-sm">{c.text}</p>
              </li>
            ))}
            {s.vote?.reason && (
              <li className="flex gap-4 py-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{s.vote.concept}</span>
                <p className="text-sm"><b>Your comment:</b> {s.vote.reason}</p>
              </li>
            )}
          </ul>
        </section>
        <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-xl font-semibold">Common concerns</h2>
          <ul className="mt-4 space-y-3">
            {SAMPLE_CONCERNS.map((c) => (
              <li key={c} className="flex items-center gap-3 rounded-2xl bg-warning/60 px-4 py-3 text-sm font-medium text-warning-foreground">
                <AlertTriangle className="h-4 w-4 shrink-0" /> {c}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
