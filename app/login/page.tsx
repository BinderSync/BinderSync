"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";

function LoginInner() {
  const router = useRouter();
  const justReset = useSearchParams().get("reset") === "1";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(email: string, password: string, remember: boolean) {
    setError(null);
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      remember: remember ? "1" : "",
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Incorrect email or password.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthForm
      title="Log in"
      submitLabel="Log in"
      loading={loading}
      error={error}
      notice={justReset ? "Password updated — log in with your new password." : null}
      onSubmit={handleSubmit}
      showRemember
      footer={
        <>
          No account?{" "}
          <Link href="/register" style={{ fontWeight: 600 }}>
            Create one
          </Link>
          {" · "}
          <Link href="/forgot-password" style={{ fontWeight: 600 }}>
            Forgot password?
          </Link>
        </>
      }
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
