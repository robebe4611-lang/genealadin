import { createFileRoute } from "@tanstack/react-router";
import { Presentation } from "@/components/stage/Presentation";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <Presentation />;
}
