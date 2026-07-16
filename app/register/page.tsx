"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(email: string, password: string) {
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Could not create account.");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      remember: "1",
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Account created — please log in.");
      router.push("/login");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthForm
      title="Create your account"
      submitLabel="Create account"
      loading={loading}
      error={error}
      onSubmit={handleSubmit}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" style={{ fontWeight: 600 }}>
            Log in
          </Link>
          <div style={{ marginTop: 10, fontSize: 11, opacity: 0.6, lineHeight: 1.5 }}>
            By creating an account you agree to the{" "}
            <Link href="/terms" style={{ fontWeight: 600 }}>
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" style={{ fontWeight: 600 }}>
              Privacy Policy
            </Link>
            .
          </div>
        </>
      }
    />
  );
}
