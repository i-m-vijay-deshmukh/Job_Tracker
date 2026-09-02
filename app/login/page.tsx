"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Briefcase, Loader2, Mail, ShieldCheck } from "lucide-react";

type EmailStep = "enter-email" | "enter-otp";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailStep, setEmailStep] = useState<EmailStep>("enter-email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setError(null);
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailLoading(true);
    // shouldCreateUser: true lets a brand-new email register via OTP too,
    // not just sign in — covers the "new account registration" case.
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setEmailLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEmailStep("enter-otp");
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });
    setEmailLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-card bg-steel-500 text-paper">
            <Briefcase size={18} />
          </span>
          <span className="font-display text-xl font-medium">Job Tracker</span>
        </div>

        <h1 className="font-display text-2xl font-medium leading-tight">
          Track every application in one place
        </h1>
        <p className="mt-2 text-sm text-ink/60">
          Sign in to see the applications you've saved, or start a new list.
        </p>

        <div className="mt-8 rounded-card border border-ink/10 bg-white p-6">
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="flex w-full items-center justify-center gap-2 rounded-card border border-ink/15 bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-ink/[0.03] disabled:opacity-60"
          >
            {googleLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-ink/40">
            <div className="h-px flex-1 bg-ink/10" />
            or use your email
            <div className="h-px flex-1 bg-ink/10" />
          </div>

          {emailStep === "enter-email" ? (
            <form onSubmit={handleSendOtp} className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-ink/70">Email address</span>
                <div className="flex items-center gap-2 rounded-card border border-ink/15 px-3 py-2.5 focus-within:border-steel-500">
                  <Mail size={15} className="text-ink/40" />
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none placeholder:text-ink/30"
                  />
                </div>
              </label>
              <button
                type="submit"
                disabled={emailLoading}
                className="flex w-full items-center justify-center gap-2 rounded-card bg-ink px-4 py-2.5 text-sm font-medium text-paper transition hover:bg-ink/90 disabled:opacity-60"
              >
                {emailLoading && <Loader2 size={16} className="animate-spin" />}
                Send code
              </button>
              <p className="text-center text-xs text-ink/40">
                New here? The same code signs you up automatically.
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-ink/70">
                  Enter the code sent to {email}
                </span>
                <div className="flex items-center gap-2 rounded-card border border-ink/15 px-3 py-2.5 focus-within:border-steel-500">
                  <ShieldCheck size={15} className="text-ink/40" />
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full bg-transparent text-sm tracking-widest outline-none placeholder:text-ink/30"
                  />
                </div>
              </label>
              <button
                type="submit"
                disabled={emailLoading}
                className="flex w-full items-center justify-center gap-2 rounded-card bg-ink px-4 py-2.5 text-sm font-medium text-paper transition hover:bg-ink/90 disabled:opacity-60"
              >
                {emailLoading && <Loader2 size={16} className="animate-spin" />}
                Verify and sign in
              </button>
              <button
                type="button"
                onClick={() => setEmailStep("enter-email")}
                className="w-full text-center text-xs text-ink/50 hover:text-ink/80"
              >
                Use a different email
              </button>
            </form>
          )}

          {error && (
            <p className="mt-4 rounded-card bg-status-rejected/10 px-3 py-2 text-xs text-status-rejected">
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.82-.07-1.6-.2-2.36H12v4.47h6.47c-.28 1.5-1.13 2.78-2.4 3.63v3.02h3.88c2.27-2.09 3.57-5.17 3.57-8.76z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.02c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.11C3.24 21.3 7.28 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.2 7.2 0 010-4.54V6.62H1.26a12 12 0 000 10.76l4.01-3.11z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.28 0 3.24 2.7 1.26 6.62l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77z"
      />
    </svg>
  );
}