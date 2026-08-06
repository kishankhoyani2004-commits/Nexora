import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Resets window scroll to the top on every route change.
 *
 * React Router preserves the previous scroll offset when the URL changes, so
 * navigating from a scrolled-down Landing page to e.g. /find-work would drop
 * the visitor into the middle of the new page instead of its hero. Public
 * pages scroll the window, so resetting it here makes every navigation start
 * at the beginning.
 *
 * Two deliberate exceptions:
 *  - A `#hash` target wins, since that's an in-page jump, not a new page.
 *  - Keyed on pathname only — same-page filter/search updates (which change
 *    only `?query` params and run their own scrollIntoView) are left alone.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: "auto", block: "start" });
        return;
      }
    }
    // Jump, not smooth — a smooth scroll on page change reads as a glitch.
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
