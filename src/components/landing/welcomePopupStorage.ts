// ── Storage keys ─────────────────────────────────────────────────────────────
// localStorage: persists across browser restarts — only set when the visitor
// checks "Don't show this again".
// sessionStorage: cleared when the browser/tab session ends — used for the
// "show only once per browser session" rule.
export const WELCOME_DONT_SHOW_AGAIN_KEY = "nexora_welcome_popup_dismissed";
export const WELCOME_SHOWN_THIS_SESSION_KEY = "nexora_welcome_popup_shown";
// Purely a UX signal (pre-selects the role tab in the existing auth modal) —
// never read by anything auth-related, so it can't affect login/signup logic.
export const WELCOME_PREFERRED_ROLE_KEY = "nexora_preferred_role";

/** Whether the welcome popup is allowed to show right now (guests only, and
 * only if neither "don't show again" nor "already shown this session" is set).
 * Callers are still responsible for checking isAuthenticated/isLoading. */
export function shouldShowWelcomePopup(): boolean {
  try {
    if (localStorage.getItem(WELCOME_DONT_SHOW_AGAIN_KEY) === "true") return false;
    if (sessionStorage.getItem(WELCOME_SHOWN_THIS_SESSION_KEY) === "true") return false;
    return true;
  } catch {
    // Storage can throw in locked-down/private-browsing contexts — fail open
    // to "don't show" rather than risk breaking the page.
    return false;
  }
}

export function getPreferredRole(): "client" | "freelancer" | null {
  try {
    const value = localStorage.getItem(WELCOME_PREFERRED_ROLE_KEY);
    return value === "client" || value === "freelancer" ? value : null;
  } catch {
    return null;
  }
}
