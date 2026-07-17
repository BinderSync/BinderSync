"use client";

import { useEffect, useState } from "react";
import { mix } from "@/lib/theme";

/** Light/dark toggle. The theme lives as `data-theme` on <html> (set
 * before hydration by the inline script in the root layout) and persists
 * in localStorage. */
export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the pre-hydration DOM state once on mount
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.dataset.theme = "dark";
    } else {
      delete document.documentElement.dataset.theme;
    }
    try {
      localStorage.setItem("bs-theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        appearance: "none",
        border: `1px solid ${mix(15)}`,
        background: "transparent",
        color: "inherit",
        width: 34,
        height: 34,
        borderRadius: 9,
        cursor: "pointer",
        fontSize: 15,
        lineHeight: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "none",
      }}
    >
      {dark === null ? "◐" : dark ? "☀" : "☾"}
    </button>
  );
}
