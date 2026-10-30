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

async function UserNav() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Link href="/login" className="nav-link">
        Staff login
      </Link>
    );
  }

  return (
    <>
      <Link href="/dashboard" className="nav-link">
        Dashboard
      </Link>
      <div className="nav-user">
        <span className="user-badge">
          <span className="user-name">{user.name}</span>
          <span className="user-role">{user.role}</span>
        </span>
        <LogoutButton />
      </div>
    </>
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
            <nav className="site-nav">
              <Link href="/submit" className="nav-link">
                Submit a complaint
              </Link>
              <Link href="/track" className="nav-link">
                Track a complaint
              </Link>
              <Suspense
                fallback={
                  <Link href="/login" className="nav-link">
                    Staff login
                  </Link>
                }
              >
                <UserNav />
              </Suspense>
            </nav>
          </div>
        </header>
        <main className="main-content">
          <div className="container">{children}</div>
        </main>
      </body>
    </html>
  );
}
