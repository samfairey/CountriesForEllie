import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { applyTheme, getSettings } from "./hooks/useSettings";

// Apply saved theme before mount to avoid a flash of the default theme
applyTheme(getSettings().theme);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
