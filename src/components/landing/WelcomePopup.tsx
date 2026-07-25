import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Briefcase, Search, X, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";
import {
  WELCOME_DONT_SHOW_AGAIN_KEY,
  WELCOME_SHOWN_THIS_SESSION_KEY,
  WELCOME_PREFERRED_ROLE_KEY,
} from "@/components/landing/welcomePopupStorage";

interface WelcomePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectClient: () => void;
  onSelectFreelancer: () => void;
  onLogin: () => void;
  onCreateAccount: () => void;
}

export function WelcomePopup({
  isOpen,
  onClose,
  onSelectClient,
  onSelectFreelancer,
  onLogin,
  onCreateAccount,
}: WelcomePopupProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Every path out of this popup goes through here so the session/"don't show
  // again" flags are recorded no matter how the visitor dismisses it.
  const finalize = () => {
    try {
      sessionStorage.setItem(WELCOME_SHOWN_THIS_SESSION_KEY, "true");
      if (dontShowAgain) localStorage.setItem(WELCOME_DONT_SHOW_AGAIN_KEY, "true");
    } catch {
      // ignore storage failures — closing the popup must never be blocked
    }
  };

  const handleClose = () => { finalize(); onClose(); };

  const handleSelectRole = (role: "client" | "freelancer", next: () => void) => {
    try { localStorage.setItem(WELCOME_PREFERRED_ROLE_KEY, role); } catch { /* non-critical */ }
    finalize();
    next();
  };

  const handleLogin = () => { finalize(); onLogin(); };
  const handleCreateAccount = () => { finalize(); onCreateAccount(); };

  // ESC closes the popup while it's open.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, dontShowAgain]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop — clicking it closes the popup */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm"
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 14 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-popup-title"
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-surface-border bg-surface-card p-6 shadow-2xl sm:p-8"
          >
            <button
              onClick={handleClose}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-xl p-1.5 text-ink-400 transition-colors hover:bg-surface-muted hover:text-ink-900"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="text-center">
              <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-secondary text-lg font-black text-white shadow-pop">
                N
              </span>
              <h2 id="welcome-popup-title" className="text-2xl font-extrabold tracking-tight text-ink-900">
                Welcome to Nexora
              </h2>
              <p className="mt-1 text-sm font-semibold text-brand-600">AI-Powered Freelance Marketplace</p>
              <p className="mt-2 text-sm text-ink-500">Choose how you want to continue.</p>
            </div>

            {/* Role options */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col rounded-2xl border border-surface-border p-4 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/40">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                  <Briefcase className="h-5 w-5" />
                </span>
                <p className="mt-2.5 text-sm font-bold text-ink-900">Hire Talent</p>
                <p className="mt-1 text-xs text-ink-500">I want to hire freelancers and manage projects.</p>
                <Button
                  size="sm"
                  className="mt-3.5"
                  onClick={() => handleSelectRole("client", onSelectClient)}
                >
                  Continue as Client
                </Button>
              </div>

              <div className="flex flex-col rounded-2xl border border-surface-border p-4 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/40">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                  <Search className="h-5 w-5" />
                </span>
                <p className="mt-2.5 text-sm font-bold text-ink-900">Find Work</p>
                <p className="mt-1 text-xs text-ink-500">I want to find freelance jobs and earn money.</p>
                <Button
                  size="sm"
                  className="mt-3.5"
                  onClick={() => handleSelectRole("freelancer", onSelectFreelancer)}
                >
                  Continue as Freelancer
                </Button>
              </div>
            </div>

            {/* Login / Create Account */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={handleLogin}>Login</Button>
              <Button variant="outline" onClick={handleCreateAccount}>Create Account</Button>
            </div>

            {/* Guest + don't show again */}
            <div className="mt-5 flex flex-col items-center gap-3 border-t border-surface-border pt-4">
              <button
                onClick={handleClose}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-brand-600"
              >
                <UserRound className="h-4 w-4" />
                Continue as Guest
              </button>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-400">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className={cn(
                    "h-3.5 w-3.5 rounded border-surface-border text-brand-600 focus:ring-brand-500"
                  )}
                />
                Don't show this again
              </label>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
