import { createFileRoute } from "@tanstack/react-router";
import { PitchPlayer } from "@/components/pitch/PitchPlayer";

export const Route = createFileRoute("/pitch")({
  head: () => ({ meta: [{ title: "גזפלו — פיץ'" }] }),
  component: PitchPlayer,
});
