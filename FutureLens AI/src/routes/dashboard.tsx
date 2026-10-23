import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, BarChart3, CheckCircle2, MessageSquare, Users } from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useEffect, useState } from "react";
import { DemoBadge } from "@/components/SiteHeader";
import { DEMO_CONSULTATION_ID } from "@/lib/futurelens";
import { getCurrentUser } from "@/server/auth";
import { getDeveloperDashboard, type DeveloperDashboardData } from "@/server/developer-dashboard";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Developer Dashboard — FutureLens AI" },
      { name: "description", content: "Live community consultation statistics for developers." },
    ],
  }),
  component: Dashboard,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-5)"];

function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DeveloperDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getCurrentUser().then(async (auth) => {
      if (!auth.user || auth.user.role !== "developer") {
        navigate({ to: "/developer-login" });
        return;
      }
      try {
        setData(await getDeveloperDashboard({ data: { consultationId: DEMO_CONSULTATION_ID } }));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard statistics.");
      }
    });
  }, [navigate]);

  if (error) {
    return <div className="mx-auto max-w-3xl px-5 pt-16 lg:px-8"><div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-8 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-destructive" /><h1 className="mt-4 text-2xl font-semibold">Unable to load dashboard</h1><p className="mt-2 text-muted-foreground">{error}</p></div></div>;
  }
  if (!data) return <div className="mx-auto max-w-3xl px-5 pt-16 text-center text-muted-foreground">Loading live consultation statistics…</div>;

  const totalVotes = data.voteCount || 1;
  const pie = data.concepts.map((concept) => ({ name: concept.name, value: concept.votes }));
  const requestBars = data.recentRequests.map((request, index) => ({ name: `Request ${index + 1}`, count: request.body.length }));
  const phaseLabel = data.consultation.phase.replace("_", " ");

  return (
    <div className="mx-auto max-w-7xl px-5 pt-12 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow">Developer dashboard</p><h1 className="mt-2 text-4xl font-semibold md:text-5xl">{data.consultation.title}</h1></div>
        <DemoBadge>Live Supabase data</DemoBadge>
      </div>
      <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: Users, label: "Unique residents", value: data.participantCount },
          { icon: MessageSquare, label: "Feedback submissions", value: `${data.feedbackCount}/${data.consultation.feedbackThreshold}` },
          { icon: BarChart3, label: "Votes cast", value: data.voteCount },
          { icon: CheckCircle2, label: "Consultation phase", value: phaseLabel },
        ].map((stat) => <div key={stat.label} className="rounded-3xl border border-border bg-card p-6 shadow-soft"><stat.icon className="h-5 w-5 text-primary" /><p className="mt-4 text-sm text-muted-foreground">{stat.label}</p><p className="mt-1 font-display text-2xl font-semibold capitalize">{stat.value}</p></div>)}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-xl font-semibold">Vote share</h2>
          {data.voteCount > 0 ? <div className="h-56"><ResponsiveContainer><PieChart><Pie data={pie} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={3} stroke="none">{pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div> : <p className="py-20 text-center text-sm text-muted-foreground">No votes recorded yet.</p>}
          <ul className="space-y-2 text-sm">{data.concepts.map((concept, i) => <li key={concept.id} className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{concept.name}</span><span className="font-semibold">{Math.round((concept.votes / totalVotes) * 100)}%</span></li>)}</ul>
        </section>
        <section className="rounded-3xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
          <h2 className="text-xl font-semibold">Generated concepts</h2>
          <div className="mt-5 space-y-3">{data.concepts.length > 0 ? data.concepts.map((concept) => <div key={concept.id} className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3"><span className="font-medium">{concept.name}</span><span className="text-sm text-muted-foreground">{concept.status} · {concept.imageReady ? "image ready" : "image pending"} · {concept.votes} votes</span></div>) : <p className="text-sm text-muted-foreground">No concepts generated yet.</p>}</div>
          <h2 className="mt-8 text-xl font-semibold">Recent request activity</h2>
          {requestBars.length > 0 ? <div className="mt-3 h-48"><ResponsiveContainer><BarChart data={requestBars} layout="vertical" margin={{ left: 20 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="count" fill="var(--chart-1)" radius={[0, 8, 8, 0]} barSize={18} /></BarChart></ResponsiveContainer></div> : <p className="mt-3 text-sm text-muted-foreground">No resident requests yet.</p>}
          <h2 className="mt-8 text-xl font-semibold">Resident requests</h2>
          {data.recentRequests.length > 0 ? (
            <div className="mt-3 space-y-3">
              {data.recentRequests.map((request, index) => (
                <article key={`${request.createdAt}-${index}`} className="rounded-2xl border border-border p-4">
                  <p className="text-sm leading-6">{request.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Submitted {new Date(request.createdAt).toLocaleString()}
                  </p>
                </article>
              ))}
            </div>
          ) : <p className="mt-3 text-sm text-muted-foreground">No resident requests yet.</p>}
        </section>
      </div>
    </div>
  );
}
