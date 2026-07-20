import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, MailCheck, Key, Lock, Eye, EyeOff } from "lucide-react";
import { AuthLayout } from "@/layouts/AuthLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/constants/routes";
import { useNotification } from "@/context/NotificationContext";
import { apiClient } from "@/lib/axios";

export default function ForgotPassword() {
  const [step, setStep] = useState<"email" | "otp" | "success" >("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { notify } = useNotification();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      notify("Please enter your email address", "error");
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiClient.post<{ success: boolean; message?: string }>("/auth/forgot-password", { email });
      notify(response.data.message || "OTP sent to your email", "success");
      setStep("otp");
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || "Something went wrong";
      notify(errMsg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      notify("Please enter a valid 6-digit OTP", "error");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      notify("Password must be at least 6 characters long", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      notify("Passwords do not match", "error");
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiClient.post<{ success: boolean; message?: string }>("/auth/reset-password", { email, otp, newPassword });
      notify(response.data.message || "Password reset successful", "success");
      setStep("success");
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || "Invalid or expired OTP";
      notify(errMsg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      heroTitle="Precision in Every Connection"
      heroSubtitle="Empowering high-end professionals with AI-driven matching and a global network of elite talent."
      heroImage="https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&q=80"
    >
      <div className="rounded-3xl border border-surface-border bg-surface-card p-8 shadow-card">
        {step === "success" && (
          <div className="text-center">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
              <MailCheck className="h-6 w-6" />
            </span>
            <h2 className="text-xl font-extrabold text-ink-900">Password Reset Complete</h2>
            <p className="mt-2 text-sm text-ink-500">
              Your password has been successfully updated. You can now log in using your new credentials.
            </p>
            <Link to={ROUTES.LOGIN} className="mt-6 inline-block w-full">
              <Button fullWidth>Go to Login</Button>
            </Link>
          </div>
        )}

        {step === "email" && (
          <>
            <h2 className="text-2xl font-extrabold text-ink-900">Forgot password?</h2>
            <p className="mt-1 text-sm text-ink-500">
              No worries — enter your email and we'll send you a 6-digit verification code.
            </p>
            <form onSubmit={handleSendOtp} className="mt-6 space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="name@company.com"
                icon={<Mail className="h-4 w-4" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" fullWidth isLoading={isLoading}>
                Send Verification Code
              </Button>
            </form>
            <Link
              to={ROUTES.LOGIN}
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-brand-600"
            >
              <ArrowLeft className="h-4 w-4" /> Back to login
            </Link>
          </>
        )}

        {step === "otp" && (
          <>
            <h2 className="text-2xl font-extrabold text-ink-900">Verify Code</h2>
            <p className="mt-1 text-sm text-ink-500">
              We've sent a 6-digit OTP code to <strong className="text-ink-700">{email}</strong>.
            </p>
            <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
              <Input
                label="Verification Code (OTP)"
                type="text"
                placeholder="123456"
                icon={<Key className="h-4 w-4" />}
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                required
              />
              <Input
                label="New Password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                icon={<Lock className="h-4 w-4" />}
                rightElement={
                  <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label="Toggle password visibility">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <Input
                label="Confirm New Password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                icon={<Lock className="h-4 w-4" />}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <Button type="submit" fullWidth isLoading={isLoading}>
                Reset Password
              </Button>
            </form>
            <button
              onClick={() => setStep("email")}
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-brand-600 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> Use a different email
            </button>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
