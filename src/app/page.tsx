import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.875rem", fontWeight: "700", marginBottom: "0.5rem" }}>
          Complaints Management Portal
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1.0625rem" }}>
          Verified citizen complaint submission, centralized status tracking, and municipal resolution management.
        </p>
      </div>

      <div className="card-grid">
        <div className="card">
          <h2 className="card-title">Citizen Portal &amp; Tracking</h2>
          <p className="card-desc">
            Log in to submit new complaints, track all your existing cases in real-time, and receive municipal responses.
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "auto" }}>
            <Link href="/submit" className="btn btn-primary">
              Submit complaint &rarr;
            </Link>
            <Link href="/my-complaints" className="btn btn-secondary">
              My complaints
            </Link>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">Register Citizen Account</h2>
          <p className="card-desc">
            Create your citizen account in seconds to keep all your service requests and complaint history in one place.
          </p>
          <Link href="/register" className="btn btn-secondary" style={{ marginTop: "auto" }}>
            Create account &rarr;
          </Link>
        </div>

        <div className="card">
          <h2 className="card-title">Staff Management Portal</h2>
          <p className="card-desc">
            Authorized municipal agents and administrators sign in to review, claim, assign, and resolve citizen tickets.
          </p>
          <Link href="/login" className="btn btn-secondary" style={{ marginTop: "auto" }}>
            Staff sign in &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
