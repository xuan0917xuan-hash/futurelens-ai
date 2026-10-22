import { createFileRoute } from "@tanstack/react-router";

import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/developer-login")({
  head: () => ({
    meta: [
      { title: "Developer sign in — FutureLens AI" },
      { name: "description", content: "Sign in to the FutureLens developer workspace." },
    ],
  }),
  component: () => <AuthForm role="developer" />,
});
