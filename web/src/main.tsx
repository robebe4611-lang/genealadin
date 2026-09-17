import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { HawamExperience } from "@/components/hawam/HawamExperience";
import "@/styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HawamExperience />
  </StrictMode>,
);
