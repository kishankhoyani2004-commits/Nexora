import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { AuthLayout } from "@/layouts/AuthLayout";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { ROUTES } from "@/constants/routes";
import { FcGoogle } from "react-icons/fc";
import { googleLogin } from "@/services/auth.service";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | null>(null);
  const { login, loginWithToken } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // ── Email / password ───────────────────────────────────────────────────────
  const onSubmit = async (values: FormValues) => {
    try {
      const user = await login({ email: values.email, password: values.password });
      notify(`Welcome back, ${user.fullName.split(" ")[0]}!`, "success");
      navigate(
        user.role === "admin" ? ROUTES.ADMIN_DASHBOARD : ROUTES.FREELANCER_DASHBOARD,
        { replace: true }
      );
    } catch (err: any) {
      notify(err.message || "Invalid email or password", "error");
    }
  };

  // ── OAuth (Google / GitHub) ────────────────────────────────────────────────
  const handleOAuth = async (provider: "google") => {
    setOauthLoading(provider);
    try {
      const data = await googleLogin();

      // null means redirect flow was triggered (popup blocked) — page will reload
      if (!data) return;

      localStorage.setItem("token", data.token);
      localStorage.setItem("nexora_access_token", data.token);
      if (data.refreshToken) localStorage.setItem("nexora_refresh_token", data.refreshToken);

      // Rehydrate context with fresh user from /auth/me
      const user = await loginWithToken(data.token);
      notify(`Welcome, ${user.fullName.split(" ")[0]}!`, "success");
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
      heroTitle="Precision in Every Connection"
      heroSubtitle="Empowering high-end professionals with AI-driven matching and a global network of elite talent."
      heroImage="https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80"
    >
      <div className="rounded-3xl border border-surface-border bg-surface-card p-8 shadow-card">
        <h2 className="text-2xl font-extrabold text-ink-900">Welcome Back</h2>
        <p className="mt-1 text-sm text-ink-500">Please enter your details to sign in.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="name@company.com"
            icon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            icon={<Lock className="h-4 w-4" />}
            error={errors.password?.message}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            {...register("password")}
          />
          <div className="flex items-center justify-between">
            <Checkbox label="Remember me" {...register("remember")} />
            <Link to={ROUTES.FORGOT_PASSWORD} className="text-sm font-semibold text-brand-600">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" fullWidth isLoading={isSubmitting}>
            Sign In
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
            <span>Google</span>
          </Button>
        </div>

        <p className="mt-6 text-center text-sm text-ink-500">
          Don't have an account?{" "}
          <Link to={ROUTES.SIGNUP} className="font-semibold text-brand-600">
            Sign Up
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
