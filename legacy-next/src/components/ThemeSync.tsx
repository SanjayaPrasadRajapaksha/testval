"use client";

import { useEffect } from "react";

export function ThemeSync() {
  useEffect(() => {
    const stored = localStorage.getItem("evalscout-theme-v1") || "dark";
    document.documentElement.dataset.theme = stored;
  }, []);
  return null;
}

export function setTheme(theme: "dark" | "light") {
  localStorage.setItem("evalscout-theme-v1", theme);
  document.documentElement.dataset.theme = theme;
}
