import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Staff Login - Complaints Portal",
};

async function LoginContent() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div style={{ maxWidth: "420px", margin: "2rem auto" }}>
      <div className="card">
        <h1 className="card-title" style={{ textAlign: "center", marginBottom: "0.5rem" }}>
          Staff Sign In
        </h1>
        <p className="card-desc" style={{ textAlign: "center" }}>
          Authorized staff credentials required to access the dashboard.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
