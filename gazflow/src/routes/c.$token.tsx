import { createFileRoute } from "@tanstack/react-router";
import { CustomerApp } from "@/components/ops/CustomerApp";

export const Route = createFileRoute("/c/$token")({
  head: () => ({ meta: [{ title: "طلب غاز · הזמנת גז" }, { name: "robots", content: "noindex" }] }),
  component: CustomerPage,
});

function CustomerPage() {
  const { token } = Route.useParams();
  return <CustomerApp token={token} />;
}
