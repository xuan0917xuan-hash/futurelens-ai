import { createFileRoute } from "@tanstack/react-router";

import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Resident sign in — FutureLens AI" },
      { name: "description", content: "Sign in to save your consultation participation and vote." },
    ],
  }),
  component: () => <AuthForm role="resident" />,
});
