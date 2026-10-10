import { createFileRoute } from "@tanstack/react-router";
import { DriverApp } from "@/components/ops/DriverApp";

export const Route = createFileRoute("/d/$token")({
  head: () => ({ meta: [{ title: "السائق · נהג" }, { name: "robots", content: "noindex" }] }),
  component: DriverPage,
});

function DriverPage() {
  const { token } = Route.useParams();
  return <DriverApp token={token} />;
}
