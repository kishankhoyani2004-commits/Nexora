import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Eye, EyeOff, Mail, Lock, X, User, KeyRound,
  ShieldCheck, Sparkles, Briefcase, Search, ArrowLeft,
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { getRedirectPath } from "@/utils/getRedirectPath";
import { googleLogin } from "@/services/auth.service";
import { cn } from "@/utils/cn";
import type { UserRole } from "@/types";

// ── Schemas ────────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email:    z.string().email("Enter a valid email address"),
  password: z.string().min(6, "At least 6 characters"),
});

const signupSchema = z
  .object({
    fullName:        z.string().min(2, "Enter your full name"),
    email:           z.string().email("Enter a valid email address"),
    password:        z.string().min(6, "At least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type LoginValues  = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;

export interface LoginModalProps {
  isOpen:      boolean;
  onClose:     () => void;
  defaultTab?: "signin" | "signup";
  /** Pre-select a role when opening from "Hire Talent" */
  defaultRole?: UserRole;
}

// ── Role selector card ─────────────────────────────────────────────────────────

function RoleCard({
  role,
  selected,
  onSelect,
}: {
  role:     UserRole;
  selected: boolean;
  onSelect: () => void;
}) {
  const isClient = role === "client";
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex flex-1 flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition-all",
        selected
          ? "border-brand-500 bg-brand-50"
          : "border-surface-border hover:border-brand-300 hover:bg-surface-muted"
      )}
    >
      <span className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
        selected ? "bg-brand-100 text-brand-600" : "bg-surface-muted text-ink-400"
      )}>
        {isClient ? <Briefcase className="h-4 w-4" /> : <Search className="h-4 w-4" />}
      </span>
      <p className={cn("text-xs font-bold", selected ? "text-brand-700" : "text-ink-600")}>
        {isClient ? "Hire Talent" : "Find Work"}
      </p>
      <p className="text-xs text-ink-400">{isClient ? "I'm a client" : "I'm a freelancer"}</p>
    </button>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export function LoginModal({
  isOpen,
  onClose,
  defaultTab  = "signin",
  defaultRole = "freelancer",
}: LoginModalProps) {
  const [tab,          setTab]          = useState<"signin" | "signup">(defaultTab);
  const [selectedRole, setSelectedRole] = useState<UserRole>(defaultRole);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | null>(null);

  // Set once sign-up succeeds but the account still needs its emailed code
  // confirmed — switches the signup panel into the OTP step below.
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [otp,        setOtp]        = useState("");
  const [verifying,  setVerifying]  = useState(false);
  const [resending,  setResending]  = useState(false);

  const { login, register: registerUser, loginWithToken, verifyEmail, resendVerificationCode } = useAuth();
  const { notify }  = useNotification();
  const navigate    = useNavigate();

  const loginForm  = useForm<LoginValues>({  resolver: zodResolver(loginSchema)  });
  const signupForm = useForm<SignupValues>({ resolver: zodResolver(signupSchema) });

  const switchTab = (next: "signin" | "signup") => {
    setTab(next);
    setShowPassword(false);
    setShowConfirm(false);
    setVerificationEmail(null);
    setOtp("");
    loginForm.reset();
    signupForm.reset();
  };

  // After a successful auth, close modal and navigate to the correct dashboard
  const finish = (role?: string | null) => {
    onClose();
    loginForm.reset();
    signupForm.reset();
    navigate(getRedirectPath(role), { replace: true });
  };

  // ── Sign In ────────────────────────────────────────────────────────────────
  const onSignIn = async (values: LoginValues) => {
    try {
      const user = await login({ email: values.email, password: values.password });
      notify(`Welcome back, ${user.fullName.split(" ")[0]}!`, "success");
      finish(user.role);
    } catch (err: any) {
      notify(err.message || "Invalid email or password.", "error");
    }
  };

  // ── Sign Up ────────────────────────────────────────────────────────────────
  const onSignUp = async (values: SignupValues) => {
    try {
      const result = await registerUser({ ...values, role: selectedRole });
      if ("requiresVerification" in result) {
        setVerificationEmail(result.email);
        notify("Account created! Enter the code we emailed you to finish signing up.", "success");
        return;
      }
      notify(`Welcome to Nexora, ${result.fullName.split(" ")[0]}!`, "success");
      finish(result.role ?? selectedRole);
    } catch (err: any) {
      notify(err.message || "Failed to create account.", "error");
    }
  };

  // ── Verify code ────────────────────────────────────────────────────────────
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationEmail || otp.length !== 6) {
      notify("Please enter the 6-digit code from your email.", "error");
      return;
    }
    setVerifying(true);
    try {
      const user = await verifyEmail(verificationEmail, otp);
      notify(`Welcome to Nexora, ${user.fullName.split(" ")[0]}!`, "success");
      finish(user.role);
    } catch (err: any) {
      notify(err.response?.data?.message || err.message || "Invalid or expired code.", "error");
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!verificationEmail) return;
    setResending(true);
    try {
      await resendVerificationCode(verificationEmail);
      notify("A new code has been sent to your email.", "success");
    } catch (err: any) {
      notify(err.response?.data?.message || err.message || "Failed to resend code.", "error");
    } finally {
      setResending(false);
    }
  };

  // ── Google OAuth ───────────────────────────────────────────────────────────
  const handleOAuth = async (provider: "google") => {
    setOauthLoading(provider);
    try {
      const data = await googleLogin();
      if (!data) { onClose(); return; }

      const user = await loginWithToken(data.token, data.refreshToken);
      notify(`Welcome, ${user.fullName.split(" ")[0]}!`, "success");
      finish(user.role);
    } catch (err: any) {
      if (
        err?.code === "auth/popup-closed-by-user" ||
        err?.code === "auth/cancelled-popup-request"
      ) return;
      notify(err.message || "Google sign-in failed. Please try again.", "error");
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

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{    opacity: 0, scale: 0.96, y: 14 }}
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

            <div className="flex min-h-[540px] flex-col md:flex-row">

              {/* ── LEFT — branding + OAuth ──────────────────────────────── */}
              <div className="flex w-full flex-col justify-between bg-gradient-to-br from-brand-500 to-brand-secondary p-8 text-white md:w-[46%]">
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
                      : "Create your account and start building on Nexora today."}
                  </p>

                  <div className="mt-6 space-y-2.5">
                    {[
                      { icon: Sparkles,    text: "AI-powered job matching"   },
                      { icon: ShieldCheck, text: "Escrow-secured payments"  },
                    ].map(({ icon: Icon, text }) => (
                      <div key={text} className="flex items-center gap-2.5 text-sm text-white/80">
                        <Icon className="h-4 w-4 shrink-0 text-white/60" />
                        {text}
                      </div>
                    ))}
                  </div>
                </div>

                {/* OAuth */}
                <div className="mt-8">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/60">
                    Quick sign {tab === "signin" ? "in" : "up"} with
                  </p>
                  <button
                    type="button"
                    disabled={!!oauthLoading}
                    onClick={() => handleOAuth("google")}
                    className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/10 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 disabled:opacity-50 cursor-pointer"
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

              {/* ── RIGHT — form ─────────────────────────────────────────── */}
              <div className="flex w-full flex-col justify-center p-8 md:w-[54%]">
                {/* Tab switcher */}
                <div className="mb-5 flex rounded-xl border border-surface-border bg-surface-app p-1">
                  {(["signin", "signup"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => switchTab(t)}
                      className={cn(
                        "flex-1 rounded-lg py-2 text-sm font-semibold transition-all",
                        tab === t
                          ? "bg-surface-card text-ink-900 shadow-sm"
                          : "text-ink-400 hover:text-ink-700"
                      )}
                    >
                      {t === "signin" ? "Sign In" : "Sign Up"}
                    </button>
                  ))}
                </div>

                {/* ── SIGN IN ─────────────────────────────────────────────── */}
                {tab === "signin" && (
                  <>
                    <p className="mb-1 text-base font-bold text-ink-900">Sign in with email</p>
                    <p className="mb-4 text-xs text-ink-400">Enter your credentials below.</p>
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
                          onClick={() => { onClose(); navigate("/forgot-password"); }}
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
                        <button type="button" onClick={() => switchTab("signup")}
                          className="font-semibold text-brand-600 hover:underline">
                          Sign Up
                        </button>
                      </p>
                    </form>
                  </>
                )}

                {/* ── SIGN UP: verify email step ────────────────────────────── */}
                {tab === "signup" && verificationEmail && (
                  <>
                    <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
                      <ShieldCheck className="h-5 w-5" />
                    </span>
                    <p className="mb-1 text-base font-bold text-ink-900">Verify your email</p>
                    <p className="mb-4 text-xs text-ink-400">
                      We've sent a 6-digit code to <strong className="text-ink-700">{verificationEmail}</strong>.
                    </p>
                    <form onSubmit={handleVerify} className="space-y-4">
                      <Input
                        label="Verification Code (OTP)"
                        type="text"
                        placeholder="123456"
                        icon={<KeyRound className="h-4 w-4" />}
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                        required
                      />
                      <Button type="submit" fullWidth isLoading={verifying}>
                        Verify & Continue
                      </Button>
                    </form>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <button
                        onClick={() => { setVerificationEmail(null); setOtp(""); }}
                        className="inline-flex items-center gap-1.5 font-semibold text-ink-500 hover:text-brand-600 cursor-pointer"
                      >
                        <ArrowLeft className="h-4 w-4" /> Back
                      </button>
                      <button
                        onClick={handleResend}
                        disabled={resending}
                        className="font-semibold text-brand-600 hover:underline disabled:opacity-50 cursor-pointer"
                      >
                        {resending ? "Sending…" : "Resend code"}
                      </button>
                    </div>
                  </>
                )}

                {/* ── SIGN UP ─────────────────────────────────────────────── */}
                {tab === "signup" && !verificationEmail && (
                  <>
                    <p className="mb-1 text-base font-bold text-ink-900">Create your account</p>
                    <p className="mb-3 text-xs text-ink-400">Choose your role to get started.</p>

                    {/* Role selector */}
                    <div className="mb-4 flex gap-3">
                      <RoleCard role="client"     selected={selectedRole === "client"}     onSelect={() => setSelectedRole("client")}     />
                      <RoleCard role="freelancer" selected={selectedRole === "freelancer"} onSelect={() => setSelectedRole("freelancer")} />
                    </div>

                    <form onSubmit={signupForm.handleSubmit(onSignUp)} className="space-y-3">
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
                          <button type="button" onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-[38px] text-ink-400 hover:text-ink-700"
                            aria-label="Toggle password">
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
                          <button type="button" onClick={() => setShowConfirm((v) => !v)}
                            className="absolute right-3 top-[38px] text-ink-400 hover:text-ink-700"
                            aria-label="Toggle confirm">
                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <Button type="submit" fullWidth isLoading={signupForm.formState.isSubmitting}>
                        {selectedRole === "client"
                          ? "Create Client Account"
                          : "Create Freelancer Account"}
                      </Button>
                      <p className="text-center text-xs text-ink-500">
                        Already have an account?{" "}
                        <button type="button" onClick={() => switchTab("signin")}
                          className="font-semibold text-brand-600 hover:underline">
                          Sign In
                        </button>
                      </p>
                    </form>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
