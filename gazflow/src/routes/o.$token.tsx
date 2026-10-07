import { createFileRoute } from "@tanstack/react-router";
import { OfficeApp } from "@/components/ops/OfficeApp";

export const Route = createFileRoute("/o/$token")({
  head: () => ({ meta: [{ title: "משרד · المكتب" }, { name: "robots", content: "noindex" }] }),
  component: OfficePage,
});

function OfficePage() {
  const { token } = Route.useParams();
  return <OfficeApp token={token} />;
}
