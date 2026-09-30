import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { About } from "./About/About";
import "./tokens.css";
import "./global.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Missing #root element");
}

createRoot(container).render(
  <StrictMode>
    <About />
  </StrictMode>,
);
