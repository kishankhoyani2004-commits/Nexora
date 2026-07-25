import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { User, Mail, Lock, KeyRound, Briefcase, Search, ArrowLeft, ShieldCheck } from "lucide-react";
import { AuthLayout } from "@/layouts/AuthLayout";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { ROUTES } from "@/constants/routes";
import { getRedirectPath } from "@/utils/getRedirectPath";
import { cn } from "@/utils/cn";
import { FcGoogle } from "react-icons/fc";
import { googleLogin } from "@/services/auth.service";
import type { UserRole } from "@/types";

const schema = z
  .object({
    fullName:        z.string().min(2, "Enter your full name"),
    email:           z.string().email("Enter a valid email address"),
    password:        z.string().min(6, "Minimum 6 characters"),
    confirmPassword: z.string(),
    location:        z.string().min(2, "Enter your location").optional().or(z.literal("")),
    terms:           z.literal(true, { message: "You must accept the terms" }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function Signup() {
  const [oauthLoading, setOauthLoading] = useState<"google" | null>(null);
  const { register: registerUser, loginWithToken, verifyEmail, resendVerificationCode } = useAuth();
  const { notify }   = useNotification();
  const navigate     = useNavigate();
  const [searchParams] = useSearchParams();

  // Pre-select role if user arrived via "Hire Talent" (?role=client)
  const hintRole = searchParams.get("role") as UserRole | null;
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    hintRole === "client" ? "client" : "freelancer"
  );

  // Set once registration succeeds but the account still needs its emailed
  // code confirmed — switches the card into the OTP step below.
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // ── Email / password register ──────────────────────────────────────────────
  const onSubmit = async (values: FormValues) => {
    try {
      const result = await registerUser({ ...values, role: selectedRole });
      if ("requiresVerification" in result) {
        setVerificationEmail(result.email);
        notify("Account created! Enter the code we emailed you to finish signing up.", "success");
        return;
      }
      notify(`Welcome to Nexora, ${result.fullName.split(" ")[0]}!`, "success");
      // Redirect based on the role the user actually registered with
      navigate(getRedirectPath(result.role ?? selectedRole), { replace: true });
    } catch (err: any) {
      notify(err.message || "Failed to create account. Please try again.", "error");
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
      navigate(getRedirectPath(user.role), { replace: true });
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
      if (!data) return;

      const user = await loginWithToken(data.token, data.refreshToken);
      notify(`Welcome to Nexora, ${user.fullName.split(" ")[0]}!`, "success");
      navigate(getRedirectPath(user.role), { replace: true });
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
    <AuthLayout
      heroTitle={
        selectedRole === "client" ? (
          <>Hire Top Talent <span className="text-brand-600">Powered by AI</span></>
        ) : (
          <>The Intelligence Behind <span className="text-brand-600">Global Talent.</span></>
        )
      }
      heroSubtitle={
        selectedRole === "client"
          ? "Post jobs, receive AI-matched proposals, and manage projects from one intelligent platform."
          : "Join the world's most advanced AI-powered marketplace and land premium freelance work."
      }
      heroImage="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=900&q=80"
      stats={[
        { value: "50k+", label: "Talents"      },
        { value: "98%",  label: "Success Rate" },
        { value: "120+", label: "Countries"    },
      ]}
    >
      <div className="rounded-3xl border border-surface-border bg-surface-card p-8 shadow-card">
        {verificationEmail ? (
          <>
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <h2 className="text-2xl font-extrabold text-ink-900">Verify your email</h2>
            <p className="mt-1 text-sm text-ink-500">
              We've sent a 6-digit code to <strong className="text-ink-700">{verificationEmail}</strong>.
              Enter it below to activate your account.
            </p>
            <form onSubmit={handleVerify} className="mt-6 space-y-4">
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
        ) : (
        <>
        <h2 className="text-2xl font-extrabold text-ink-900">Create your account</h2>
        <p className="mt-1 text-sm text-ink-500">
          Join thousands of professionals on Nexora.
        </p>

        {/* ── Role Selector ─────────────────────────────────────────────────── */}
        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold text-ink-700">I want to…</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedRole("client")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition-all",
                selectedRole === "client"
                  ? "border-brand-500 bg-brand-50 shadow-sm"
                  : "border-surface-border hover:border-brand-300 hover:bg-surface-muted"
              )}
            >
              <span className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                selectedRole === "client" ? "bg-brand-100 text-brand-600" : "bg-surface-muted text-ink-400"
              )}>
                <Briefcase className="h-5 w-5" />
              </span>
              <div>
                <p className={cn("text-sm font-bold", selectedRole === "client" ? "text-brand-700" : "text-ink-700")}>
                  Hire Freelancers
                </p>
                <p className="text-xs text-ink-400 mt-0.5">I'm a client</p>
              </div>
              {selectedRole === "client" && (
                <span className="mt-1 rounded-full bg-brand-500 px-2 py-0.5 text-xs font-bold text-white">
                  Selected
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole("freelancer")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition-all",
                selectedRole === "freelancer"
                  ? "border-brand-500 bg-brand-50 shadow-sm"
                  : "border-surface-border hover:border-brand-300 hover:bg-surface-muted"
              )}
            >
              <span className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                selectedRole === "freelancer" ? "bg-brand-100 text-brand-600" : "bg-surface-muted text-ink-400"
              )}>
                <Search className="h-5 w-5" />
              </span>
              <div>
                <p className={cn("text-sm font-bold", selectedRole === "freelancer" ? "text-brand-700" : "text-ink-700")}>
                  Find Work
                </p>
                <p className="text-xs text-ink-400 mt-0.5">I'm a freelancer</p>
              </div>
              {selectedRole === "freelancer" && (
                <span className="mt-1 rounded-full bg-brand-500 px-2 py-0.5 text-xs font-bold text-white">
                  Selected
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Registration form ─────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
          <Input
            label="Full Name"
            placeholder="John Doe"
            icon={<User className="h-4 w-4" />}
            error={errors.fullName?.message}
            {...register("fullName")}
          />
          <Input
            label="Work Email"
            type="email"
            placeholder="name@company.com"
            icon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="Location (optional)"
            placeholder={selectedRole === "client" ? "Your company city" : "Your preferred location"}
            error={errors.location?.message}
            {...register("location")}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              icon={<Lock className="h-4 w-4" />}
              error={errors.password?.message}
              {...register("password")}
            />
            <Input
              label="Confirm"
              type="password"
              placeholder="••••••••"
              icon={<KeyRound className="h-4 w-4" />}
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />
          </div>
          <Checkbox
            label={
              <>
                I accept the{" "}
                <span className="font-semibold text-brand-600">Terms and Conditions</span> and
                acknowledge the{" "}
                <span className="font-semibold text-brand-600">Privacy Policy</span>.
              </>
            }
            {...register("terms")}
          />
          {errors.terms && <p className="text-xs text-danger">{errors.terms.message}</p>}

          <Button type="submit" fullWidth isLoading={isSubmitting}>
            {selectedRole === "client" ? "Create Client Account" : "Create Freelancer Account"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-ink-400">
          <span className="h-px flex-1 bg-surface-border" /> or continue with{" "}
          <span className="h-px flex-1 bg-surface-border" />
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            fullWidth
            type="button"
            isLoading={oauthLoading === "google"}
            disabled={!!oauthLoading}
            onClick={() => handleOAuth("google")}
            className="flex items-center justify-center gap-2"
          >
            <FcGoogle className="h-5 w-5" />
            Google
          </Button>
        </div>

        <p className="mt-5 text-center text-sm text-ink-500">
          Already have an account?{" "}
          <Link to={ROUTES.LOGIN} className="font-semibold text-brand-600">
            Login
          </Link>
        </p>
        </>
        )}
      </div>
    </AuthLayout>
  );
}
