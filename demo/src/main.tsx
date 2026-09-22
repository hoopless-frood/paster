import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App/App";
import "../../tokens/tokens.css";
import "./global.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Missing #root element");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
