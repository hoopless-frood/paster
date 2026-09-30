import { useEffect, useState } from "react";
import styles from "./ThemeToggle.module.css";

// Also read by an inline script in each page's <head> (index.html,
// about/index.html), which applies a saved choice before first paint.
const STORAGE_KEY = "paster:theme";

type Theme = "light" | "dark";

function initialTheme(): Theme {
  const applied = document.documentElement.dataset.theme;
  if (applied === "light" || applied === "dark") {
    return applied;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Saved for this browser tab only, and only once the user has chosen, so
  // a fresh visit follows the system preference.
  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      sessionStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable: the choice just won't carry to the next page.
    }
  }

  return (
    <button type="button" className={styles.toggle} onClick={toggleTheme} aria-pressed={theme === "dark"}>
      <span aria-hidden="true">{theme === "dark" ? "☾" : "☀"}</span>
      <span className="visually-hidden">{theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}</span>
    </button>
  );
}
