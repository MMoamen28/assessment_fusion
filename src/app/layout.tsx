import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth/current-user";
import { LogoutButton } from "@/components/LogoutButton";

export const metadata: Metadata = {
  title: "Complaints Portal",
  description: "Citizen complaint submission, tracking, and management portal",
};

async function HeaderNav() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <nav className="site-nav">
        <Link href="/submit" className="nav-link">
          Submit a complaint
        </Link>
        <Link href="/register" className="nav-link">
          Register
        </Link>
        <Link href="/login" className="nav-link">
          Sign in
        </Link>
      </nav>
    );
  }

  if (user.role === "CUSTOMER") {
    return (
      <nav className="site-nav">
        <Link href="/submit" className="nav-link">
          Submit a complaint
        </Link>
        <Link href="/my-complaints" className="nav-link">
          My complaints
        </Link>
        <div className="nav-user">
          <span className="user-badge">
            <span className="user-name">{user.name}</span>
            <span className="user-role">{user.role}</span>
          </span>
          <LogoutButton />
        </div>
      </nav>
    );
  }

  // Staff (ADMIN / AGENT)
  return (
    <nav className="site-nav">
      <Link href="/dashboard" className="nav-link">
        Dashboard
      </Link>
      <Link href="/complaints/new" className="nav-link">
        New complaint
      </Link>
      <div className="nav-user">
        <span className="user-badge">
          <span className="user-name">{user.name}</span>
          <span className="user-role">{user.role}</span>
        </span>
        <LogoutButton />
      </div>
    </nav>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container">
            <Link href="/" className="site-brand">
              Complaints Portal
            </Link>
            <Suspense
              fallback={
                <nav className="site-nav">
                  <Link href="/login" className="nav-link">
                    Sign in
                  </Link>
                </nav>
              }
            >
              <HeaderNav />
            </Suspense>
          </div>
        </header>
        <main className="main-content">
          <div className="container">{children}</div>
        </main>
      </body>
    </html>
  );
}
