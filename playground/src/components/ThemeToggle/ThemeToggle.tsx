import { useEffect, useState } from "react";
import styles from "./ThemeToggle.module.css";

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(() => (systemPrefersDark() ? "dark" : "light"));

  // Not persisted, so a refresh always goes back to following the system preference.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  return (
    <button type="button" className={styles.toggle} onClick={toggleTheme} aria-pressed={theme === "dark"}>
      <span aria-hidden="true">{theme === "dark" ? "☾" : "☀"}</span>
      <span className="visually-hidden">{theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}</span>
    </button>
  );
}
