import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { RegisterForm } from "@/components/RegisterForm";

export const metadata: Metadata = {
  title: "Register - Customer Account",
  description: "Create a citizen customer account to track your submitted complaints",
};

export const instant = false;

async function RegisterContent() {
  const user = await getCurrentUser();
  if (user) {
    if (user.role === "CUSTOMER") {
      redirect("/my-complaints");
    } else {
      redirect("/dashboard");
    }
  }

  return (
    <div style={{ maxWidth: "440px", margin: "2rem auto" }}>
      <div className="card">
        <h1 className="card-title" style={{ textAlign: "center", marginBottom: "0.5rem" }}>
          Create Customer Account
        </h1>
        <p className="card-desc" style={{ textAlign: "center" }}>
          Register as a citizen customer to easily manage and track all complaints filed with your email.
        </p>
        <RegisterForm />
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
