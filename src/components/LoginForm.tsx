"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { login, ApiClientError } from "@/lib/api/client";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message || "Failed to sign in. Please verify your credentials.");
      } else {
        setError("An unexpected network error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && <Alert type="error">{error}</Alert>}

      <Field
        id="email"
        label="Email address"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
      />

      <Field
        id="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
      />

      <div style={{ marginTop: "1rem" }}>
        <Button
          type="submit"
          variant="primary"
          loading={loading}
          disabled={loading || !email.trim() || !password}
          style={{ width: "100%" }}
        >
          Sign in
        </Button>
      </div>
    </form>
  );
}
