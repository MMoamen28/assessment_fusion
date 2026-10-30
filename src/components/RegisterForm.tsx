"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { register, ApiClientError } from "@/lib/api/client";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters long.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setError("Please provide a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      router.push("/my-complaints");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message || "Failed to create account. Please check the details.");
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
        id="name"
        label="Full name"
        type="text"
        autoComplete="name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={loading}
      />

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
        label="Password (min 8 characters)"
        type="password"
        autoComplete="new-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
      />

      <Field
        id="confirmPassword"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        required
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        disabled={loading}
      />

      <div style={{ marginTop: "1rem" }}>
        <Button
          type="submit"
          variant="primary"
          loading={loading}
          disabled={loading || !name.trim() || !email.trim() || !password || !confirmPassword}
          style={{ width: "100%" }}
        >
          Create Customer Account
        </Button>
      </div>

      <div style={{ marginTop: "1.25rem", textAlign: "center", fontSize: "0.875rem", color: "var(--color-muted)" }}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: "var(--color-primary)", textDecoration: "underline" }}>
          Sign in
        </Link>
      </div>
    </form>
  );
}
