"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const isDark = stored
      ? stored === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  let isTransitioning = false;

  function handleThemeToggle() {
    if (isTransitioning) return;
    isTransitioning = true;

    const isDark = document.documentElement.classList.contains('dark');
    const toggleBtn = document.querySelector('[data-theme-toggle]');
    const rect = toggleBtn?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth - 48;
    const y = rect ? rect.top + rect.height / 2 : 24;
    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    if (!document.startViewTransition) {
      document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'light' : 'dark');
      isTransitioning = false;
      return;
    }

    const transition = document.startViewTransition(() => {
      document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'light' : 'dark');
    });

    transition.ready.then(() => {
      const expandKeyframes = {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRadius}px at ${x}px ${y}px)`,
        ],
      };
      const collapseKeyframes = {
        clipPath: [
          `circle(${maxRadius}px at ${x}px ${y}px)`,
          `circle(0px at ${x}px ${y}px)`,
        ],
      };
      const timing = {
        duration: 450,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'forwards' as const,
      };

      if (isDark) {
        // dark → light: new light page expands in
        document.documentElement.animate(
          expandKeyframes,
          { ...timing, pseudoElement: '::view-transition-new(root)' }
        );
      } else {
        // light → dark: new dark page expands in
        document.documentElement.animate(
          expandKeyframes,
          { ...timing, pseudoElement: '::view-transition-new(root)' }
        );
      }
    });

    transition.finished.then(() => {
      isTransitioning = false;
    }).catch(() => {
      isTransitioning = false;
    });
  }

  return (
    <button
      data-theme-toggle
      onClick={handleThemeToggle}
      aria-label="Toggle theme"
      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-text"
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
