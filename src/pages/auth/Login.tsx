import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import { getRedirectPath } from "@/utils/getRedirectPath";
import { FcGoogle } from "react-icons/fc";
import { googleLogin } from "@/services/auth.service";

const schema = z.object({
  email:    z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function Login() {
  const [showPassword,  setShowPassword]  = useState(false);
  const [oauthLoading,  setOauthLoading]  = useState<"google" | null>(null);
  const { login, loginWithToken }         = useAuth();
  const { notify }                        = useNotification();
  const navigate                          = useNavigate();
  const [searchParams]                    = useSearchParams();

  // If the user arrived via "Hire Talent" (?role=client) we remember that
  // so we can show the correct hero text — but actual role comes from the DB.
  const hintRole = searchParams.get("role"); // "client" | null

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // ── Email / password login ─────────────────────────────────────────────────
  const onSubmit = async (values: FormValues) => {
    try {
      // "Remember me" unchecked → session is dropped when the browser closes.
      const user = await login({ email: values.email, password: values.password }, !!values.remember);
      notify(`Welcome back, ${user.fullName.split(" ")[0]}!`, "success");
      // Role stored in MongoDB — redirect based on what the DB says
      navigate(getRedirectPath(user.role), { replace: true });
    } catch (err: any) {
      notify(err.message || "Invalid email or password", "error");
    }
  };

  // ── Google OAuth ───────────────────────────────────────────────────────────
  const handleOAuth = async (provider: "google") => {
    setOauthLoading(provider);
    try {
      const data = await googleLogin();
      if (!data) return; // redirect flow triggered — page will reload

      const user = await loginWithToken(data.token, data.refreshToken);
      notify(`Welcome, ${user.fullName.split(" ")[0]}!`, "success");
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

  const heroTitle    = hintRole === "client"
    ? "Hire World-Class Talent"
    : "Welcome Back";
  const heroSubtitle = hintRole === "client"
    ? "Sign in to your client account and start finding the best freelancers with AI-powered matching."
    : "Empowering high-end professionals with AI-driven matching and a global network of elite talent.";

  return (
    <AuthLayout
      heroTitle={heroTitle}
      heroSubtitle={heroSubtitle}
      heroImage="https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80"
    >
      <div className="rounded-3xl border border-surface-border bg-surface-card p-8 shadow-card">
        <h2 className="text-2xl font-extrabold text-ink-900">
          {hintRole === "client" ? "Client Sign In" : "Welcome Back"}
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          {hintRole === "client"
            ? "Sign in to your client account to post jobs and hire freelancers."
            : "Please enter your details to sign in."}
        </p>

        {/* Role hint badge */}
        {hintRole === "client" && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
            Hiring on Nexora
          </div>
        )}

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
            <span>Google</span>
          </Button>
        </div>

        <p className="mt-6 text-center text-sm text-ink-500">
          Don't have an account?{" "}
          <Link
            to={hintRole === "client" ? `${ROUTES.SIGNUP}?role=client` : ROUTES.SIGNUP}
            className="font-semibold text-brand-600"
          >
            Sign Up
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
