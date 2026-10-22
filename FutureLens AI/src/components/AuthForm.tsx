import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/SiteHeader";
import { signIn, signInDeveloper, signUp } from "@/server/auth";

type AuthFormProps = {
  role: "resident" | "developer";
};

export function AuthForm({ role }: AuthFormProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const isDeveloper = role === "developer";

  const submit = async () => {
    setBusy(true);
    try {
      if (isDeveloper) {
        await signInDeveloper({ data: { username, password } });
      } else if (mode === "signIn") {
        await signIn({ data: { username, password } });
      } else {
        await signUp({ data: { username, email, password, displayName: displayName || undefined } });
      }
      toast.success(isDeveloper ? "Developer sign-in successful." : mode === "signIn" ? "Welcome back." : "Account created.");
      if (isDeveloper) {
        window.location.assign("/dashboard");
      } else {
        navigate({ to: "/" });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to authenticate.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-5 lg:px-8">
      <PageHeader
        title={isDeveloper ? "Developer sign in" : mode === "signIn" ? "Welcome back" : "Create your resident account"}
        subtitle={isDeveloper ? "Developer accounts are created by the FutureLens team." : "Use a username and password to save your consultation participation."}
      />
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
        {!isDeveloper && mode === "signUp" && (
          <>
            <label className="block text-sm font-semibold">
              Email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)}
                autoComplete="email" required
                className="mt-2 w-full rounded-2xl border border-input bg-background p-3 font-normal outline-none focus:ring-2 focus:ring-ring" />
            </label>
            <label className="mt-4 block text-sm font-semibold">
              Display name
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)}
                autoComplete="name"
                className="mt-2 w-full rounded-2xl border border-input bg-background p-3 font-normal outline-none focus:ring-2 focus:ring-ring" />
            </label>
          </>
        )}
        <label className="mt-4 block text-sm font-semibold">
          Username
          <input value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())}
            pattern="[a-z0-9_]{3,32}" autoComplete="username"
            className="mt-2 w-full rounded-2xl border border-input bg-background p-3 font-normal outline-none focus:ring-2 focus:ring-ring" />
        </label>
        <label className="mt-4 block text-sm font-semibold">
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)}
            autoComplete={isDeveloper ? "current-password" : mode === "signUp" ? "new-password" : "current-password"}
            className="mt-2 w-full rounded-2xl border border-input bg-background p-3 font-normal outline-none focus:ring-2 focus:ring-ring" />
        </label>
        <Button className="mt-6 w-full" variant="hero" onClick={submit} disabled={busy}>
          {busy ? "Please wait…" : isDeveloper || mode === "signIn" ? "Sign in" : "Create resident account"}
        </Button>
        {!isDeveloper && (
          <button className="mt-4 w-full text-sm text-primary underline-offset-4 hover:underline"
            onClick={() => setMode(mode === "signIn" ? "signUp" : "signIn")}>
            {mode === "signIn" ? "Need a resident account?" : "Already have an account?"}
          </button>
        )}
        <Link
          to={isDeveloper ? "/login" : "/developer-login"}
          className="mt-4 block w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {isDeveloper ? "Resident sign in" : "Developer sign in"}
        </Link>
      </div>
    </div>
  );
}
