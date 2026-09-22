import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/project")({
  beforeLoad: () => {
    throw redirect({ to: "/projects" });
  },
});
