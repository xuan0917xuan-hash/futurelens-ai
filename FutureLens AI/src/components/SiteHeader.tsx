import { Link, useNavigate } from "@tanstack/react-router";
import { Leaf, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getCurrentUser, signOut } from "@/server/auth";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/describe", label: "Describe" },
  { to: "/concepts", label: "Concepts" },
  { to: "/compare", label: "Compare" },
  { to: "/vote", label: "Vote" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/login", label: "Sign in" },
] as const;

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-soft">
        <Leaf className="h-5 w-5" />
      </span>
      <span className="font-display text-xl font-semibold tracking-tight">
        FutureLens <span className="text-primary">AI</span>
      </span>
    </div>
  );
}

export function SiteHeader() {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<"resident" | "developer" | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    void getCurrentUser().then((result) => {
      setIsAuthenticated(Boolean(result.user));
      setUserRole(result.user?.role ?? null);
    });
  }, []);

  const logout = async () => {
    try {
      await signOut();
      setUserRole(null);
      navigate({ to: userRole === "developer" ? "/developer-login" : "/login" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to sign out.");
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              activeProps={{ className: "bg-accent text-accent-foreground" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        {isAuthenticated && (
          <Button variant="outline" size="sm" onClick={logout} aria-label="Log out">
            <LogOut /> Log out
          </Button>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-charcoal text-charcoal-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-10 text-sm md:flex-row md:items-center md:justify-between lg:px-8">
        <p className="font-display text-lg">See the Future. Shape Your Community.</p>
        <p className="opacity-70">FutureLens AI prototype · Concepts and results shown are demonstration data.</p>
      </div>
    </footer>
  );
}

export function DemoBadge({ children = "Demonstration data" }: { children?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-warning px-3 py-1 text-xs font-semibold text-warning-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-warning-foreground" />
      {children}
    </span>
  );
}

export function PageHeader({ step, title, subtitle }: { step?: string; title: string; subtitle: string }) {
  return (
    <div className="mx-auto max-w-3xl pt-14 pb-10 text-center animate-fade-up">
      {step && <p className="eyebrow mb-3">{step}</p>}
      <h1 className="text-4xl font-semibold md:text-5xl">{title}</h1>
      <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p>
    </div>
  );
}
