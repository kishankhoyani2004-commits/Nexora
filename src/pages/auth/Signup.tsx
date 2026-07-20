import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { User, Mail, Lock, KeyRound } from "lucide-react";
import { AuthLayout } from "@/layouts/AuthLayout";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { ROUTES } from "@/constants/routes";
import { FcGoogle } from "react-icons/fc";
import { googleLogin } from "@/services/auth.service";

const schema = z
  .object({
    fullName: z.string().min(2, "Enter your full name"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(6, "Minimum 6 characters"),
    confirmPassword: z.string(),
    terms: z.literal(true, { message: "You must accept the terms" }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function Signup() {
  const [oauthLoading, setOauthLoading] = useState<"google" | null>(null);
  const { register: registerUser, loginWithToken } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // ── Email / password register ──────────────────────────────────────────────
  const onSubmit = async (values: FormValues) => {
    try {
      // This is a freelancer platform — role is always freelancer
      const user = await registerUser({ ...values, role: "freelancer" });
      notify(`Welcome to Nexora, ${user.fullName.split(" ")[0]}!`, "success");
      navigate(ROUTES.FREELANCER_DASHBOARD, { replace: true });
    } catch (err: any) {
      notify(err.message || "Failed to create account. Please try again.", "error");
    }
  };

  // ── OAuth (Google / GitHub) ────────────────────────────────────────────────
  const handleOAuth = async (provider: "google") => {
    setOauthLoading(provider);
    try {
      const data = await googleLogin();

      // null means redirect flow triggered (popup blocked)
      if (!data) return;

      localStorage.setItem("token", data.token);
      localStorage.setItem("nexora_access_token", data.token);
      if (data.refreshToken) localStorage.setItem("nexora_refresh_token", data.refreshToken);

      const user = await loginWithToken(data.token);
      notify(`Welcome to Nexora, ${user.fullName.split(" ")[0]}!`, "success");
      navigate(ROUTES.FREELANCER_DASHBOARD, { replace: true });
    } catch (err: any) {
      if (
        err?.code === "auth/popup-closed-by-user" ||
        err?.code === "auth/cancelled-popup-request"
      ) {
        return;
      }
      notify(err.message || `${provider} sign-in failed. Please try again.`, "error");
    } finally {
      setOauthLoading(null);
    }
  };

  return (
    <AuthLayout
      heroTitle={
        <>
          The Intelligence Behind <span className="text-brand-600">Global Talent.</span>
        </>
      }
      heroSubtitle="Join the world's most advanced AI-powered marketplace. Connecting elite technical professionals with visionary companies through precision-matching algorithms."
      heroImage="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=900&q=80"
      stats={[
        { value: "50k+", label: "Talents" },
        { value: "98%", label: "Success Rate" },
        { value: "120+", label: "Countries" },
      ]}
    >
      <div className="rounded-3xl border border-surface-border bg-surface-card p-8 shadow-card">
        <h2 className="text-2xl font-extrabold text-ink-900">Create your account</h2>
        <p className="mt-1 text-sm text-ink-500">Join thousands of freelancers on Nexora.</p>

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
            Create Account
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-ink-400">
          <span className="h-px flex-1 bg-surface-border" /> or continue with{" "}
          <span className="h-px flex-1 bg-surface-border" />
        </div>

        <div className="flex flex-col gap-3">
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

        <p className="mt-6 text-center text-sm text-ink-500">
          Already have an account?{" "}
          <Link to={ROUTES.LOGIN} className="font-semibold text-brand-600">
            Login
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
