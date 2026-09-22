import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import "./glass.css";
import "./themes/dark-premium.css";
import "./themes/unified.css";
import { registerPwa } from "./lib/pwa";

void registerPwa().catch(() => undefined);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
