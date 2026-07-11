"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(email: string, password: string) {
    setError(null);
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
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
      onSubmit={handleSubmit}
      footer={
        <>
          No account?{" "}
          <Link href="/register" style={{ fontWeight: 600 }}>
            Create one
          </Link>
        </>
      }
    />
  );
}
