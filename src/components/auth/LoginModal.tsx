import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock, X, User, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { googleLogin } from "@/services/auth.service";

// ── Schemas ────────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "At least 6 characters"),
});

const signupSchema = z
  .object({
    fullName: z.string().min(2, "Enter your full name"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(6, "At least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;

export interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "signin" | "signup";
}

// ── OAuth buttons (used in left panel) ────────────────────────────────────────

function OAuthButtons({
  oauthLoading,
  onOAuth,
}: {
  oauthLoading: "google" | null;
  onOAuth: (p: "google") => void;
}) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={!!oauthLoading}
        onClick={() => onOAuth("google")}
        className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-surface-border bg-surface-card text-sm font-semibold text-ink-700 transition-all hover:bg-surface-muted disabled:opacity-50 cursor-pointer"
      >
        {oauthLoading === "google" ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-300 border-t-brand-600" />
        ) : (
          <FcGoogle className="h-5 w-5 shrink-0" />
        )}
        Continue with Google
      </button>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export function LoginModal({ isOpen, onClose, defaultTab = "signin" }: LoginModalProps) {
  const [tab, setTab] = useState<"signin" | "signup">(defaultTab);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | null>(null);

  const { login, register: registerUser, loginWithToken } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();

  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const signupForm = useForm<SignupValues>({ resolver: zodResolver(signupSchema) });

  const switchTab = (next: "signin" | "signup") => {
    setTab(next);
    setShowPassword(false);
    setShowConfirm(false);
    loginForm.reset();
    signupForm.reset();
  };

  const finish = (user: { fullName: string; role: string }) => {
    onClose();
    loginForm.reset();
    signupForm.reset();
    navigate(
      user.role === "admin" ? ROUTES.ADMIN_DASHBOARD : ROUTES.FREELANCER_DASHBOARD,
      { replace: true }
    );
  };

  const onSignIn = async (values: LoginValues) => {
    try {
      const user = await login({ email: values.email, password: values.password });
      notify(`Welcome back, ${user.fullName.split(" ")[0]}!`, "success");
      finish(user);
    } catch (err: any) {
      notify(err.message || "Invalid email or password.", "error");
    }
  };

  const onSignUp = async (values: SignupValues) => {
    try {
      const user = await registerUser({ ...values, role: "freelancer" });
      notify(`Welcome to Nexora, ${user.fullName.split(" ")[0]}!`, "success");
      finish(user);
    } catch (err: any) {
      notify(err.message || "Failed to create account.", "error");
    }
  };

  const handleOAuth = async (provider: "google") => {
    setOauthLoading(provider);
    try {
      const data = await googleLogin();
      if (!data) { onClose(); return; } // redirect flow triggered

      localStorage.setItem("token", data.token);
      localStorage.setItem("nexora_access_token", data.token);
      if (data.refreshToken) localStorage.setItem("nexora_refresh_token", data.refreshToken);

      const user = await loginWithToken(data.token);
      notify(`Welcome, ${user.fullName.split(" ")[0]}!`, "success");
      finish(user);
    } catch (err: any) {
      if (
        err?.code === "auth/popup-closed-by-user" ||
        err?.code === "auth/cancelled-popup-request"
      ) return;
      notify(err.message || `${provider} sign-in failed. Please try again.`, "error");
    } finally {
      setOauthLoading(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm"
          />

          {/* ── Card: horizontal two-column layout ───────────────────────── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 14 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="relative z-10 w-full max-w-[820px] overflow-hidden rounded-3xl border border-surface-border bg-surface-card shadow-2xl"
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute right-5 top-5 z-20 rounded-xl p-1.5 text-ink-400 transition-colors hover:bg-surface-muted hover:text-ink-900"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex min-h-[520px] flex-col md:flex-row">

              {/* ── LEFT — branding + OAuth ─────────────────────────────── */}
              <div className="flex w-full flex-col justify-between bg-gradient-to-br from-brand-500 to-brand-secondary p-8 text-white md:w-[46%]">
                {/* Logo */}
                <div>
                  <div className="mb-8 flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 font-extrabold text-lg backdrop-blur-sm">
                      N
                    </span>
                    <span className="text-xl font-black tracking-tight">Nexora</span>
                  </div>

                  <h2 className="text-2xl font-extrabold leading-snug tracking-tight">
                    {tab === "signin" ? "Welcome Back" : "Join the Platform"}
                  </h2>
                  <p className="mt-2 text-sm text-white/75 leading-relaxed">
                    {tab === "signin"
                      ? "Sign in to access your dashboard, proposals, and AI tools."
                      : "Create your account and start landing premium freelance work today."}
                  </p>

                  {/* Feature pills */}
                  <div className="mt-6 space-y-2.5">
                    {[
                      { icon: Sparkles, text: "AI-powered job matching" },
                      { icon: ShieldCheck, text: "Escrow-secured payments" },
                    ].map(({ icon: Icon, text }) => (
                      <div key={text} className="flex items-center gap-2.5 text-sm text-white/80">
                        <Icon className="h-4 w-4 shrink-0 text-white/60" />
                        {text}
                      </div>
                    ))}
                  </div>
                </div>

                {/* OAuth buttons */}
                <div className="mt-8">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/60">
                    Quick sign {tab === "signin" ? "in" : "up"} with
                  </p>
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      disabled={!!oauthLoading}
                      onClick={() => handleOAuth("google")}
                      className="flex h-11 w-full items-center justify-center gap-3 rounded-xl bg-white/10 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 disabled:opacity-50 cursor-pointer border border-white/20"
                    >
                      {oauthLoading === "google" ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      ) : (
                        <FcGoogle className="h-5 w-5 shrink-0" />
                      )}
                      Continue with Google
                    </button>
                  </div>
                </div>
              </div>

              {/* ── RIGHT — email form ──────────────────────────────────── */}
              <div className="flex w-full flex-col justify-center p-8 md:w-[54%]">
                {/* Tab switcher */}
                <div className="mb-6 flex rounded-xl border border-surface-border bg-surface-app p-1">
                  {(["signin", "signup"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => switchTab(t)}
                      className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                        tab === t
                          ? "bg-surface-card text-ink-900 shadow-sm"
                          : "text-ink-400 hover:text-ink-700"
                      }`}
                    >
                      {t === "signin" ? "Sign In" : "Sign Up"}
                    </button>
                  ))}
                </div>

                <div className="mb-1 text-base font-bold text-ink-900">
                  {tab === "signin" ? "Sign in with email" : "Create your account"}
                </div>
                <p className="mb-5 text-xs text-ink-400">
                  {tab === "signin"
                    ? "Enter your credentials below."
                    : "Fill in your details to get started."}
                </p>

                {/* ── SIGN IN FORM ───────────────────────────────────────── */}
                {tab === "signin" && (
                  <form onSubmit={loginForm.handleSubmit(onSignIn)} className="space-y-4">
                    <Input
                      label="Email Address"
                      type="email"
                      placeholder="you@example.com"
                      icon={<Mail className="h-4 w-4" />}
                      error={loginForm.formState.errors.email?.message}
                      {...loginForm.register("email")}
                    />
                    <div className="relative">
                      <Input
                        label="Password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        icon={<Lock className="h-4 w-4" />}
                        error={loginForm.formState.errors.password?.message}
                        {...loginForm.register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-4 top-[38px] text-ink-400 hover:text-ink-700"
                        aria-label="Toggle password"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => { onClose(); navigate(ROUTES.FORGOT_PASSWORD); }}
                        className="text-xs font-semibold text-brand-600 hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Button type="submit" fullWidth isLoading={loginForm.formState.isSubmitting}>
                      Sign In
                    </Button>
                    <p className="text-center text-xs text-ink-500">
                      Don't have an account?{" "}
                      <button
                        type="button"
                        onClick={() => switchTab("signup")}
                        className="font-semibold text-brand-600 hover:underline"
                      >
                        Sign Up
                      </button>
                    </p>
                  </form>
                )}

                {/* ── SIGN UP FORM ───────────────────────────────────────── */}
                {tab === "signup" && (
                  <form onSubmit={signupForm.handleSubmit(onSignUp)} className="space-y-4">
                    <Input
                      label="Full Name"
                      placeholder="John Doe"
                      icon={<User className="h-4 w-4" />}
                      error={signupForm.formState.errors.fullName?.message}
                      {...signupForm.register("fullName")}
                    />
                    <Input
                      label="Email Address"
                      type="email"
                      placeholder="you@example.com"
                      icon={<Mail className="h-4 w-4" />}
                      error={signupForm.formState.errors.email?.message}
                      {...signupForm.register("email")}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <Input
                          label="Password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          icon={<Lock className="h-4 w-4" />}
                          error={signupForm.formState.errors.password?.message}
                          {...signupForm.register("password")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-[38px] text-ink-400 hover:text-ink-700"
                          aria-label="Toggle password"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          label="Confirm"
                          type={showConfirm ? "text" : "password"}
                          placeholder="••••••••"
                          icon={<KeyRound className="h-4 w-4" />}
                          error={signupForm.formState.errors.confirmPassword?.message}
                          {...signupForm.register("confirmPassword")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm((v) => !v)}
                          className="absolute right-3 top-[38px] text-ink-400 hover:text-ink-700"
                          aria-label="Toggle confirm"
                        >
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button
                      type="submit"
                      fullWidth
                      isLoading={signupForm.formState.isSubmitting}
                    >
                      Create Account
                    </Button>
                    <p className="text-center text-xs text-ink-500">
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => switchTab("signin")}
                        className="font-semibold text-brand-600 hover:underline"
                      >
                        Sign In
                      </button>
                    </p>
                  </form>
                )}
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
