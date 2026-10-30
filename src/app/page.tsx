import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.875rem", fontWeight: "700", marginBottom: "0.5rem" }}>
          Complaints Management Portal
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1.0625rem" }}>
          Submit public service complaints, track status with your reference number, or sign in to manage tickets.
        </p>
      </div>

      <div className="card-grid">
        <div className="card">
          <h2 className="card-title">Submit a Complaint</h2>
          <p className="card-desc">
            File a new issue regarding billing, products, delivery, or public services.
          </p>
          <Link href="/submit" className="btn btn-primary">
            Submit complaint &rarr;
          </Link>
        </div>

        <div className="card">
          <h2 className="card-title">Track a Complaint</h2>
          <p className="card-desc">
            Check the live progress, status updates, and public notes on an existing ticket.
          </p>
          <Link href="/track" className="btn btn-secondary">
            Track status &rarr;
          </Link>
        </div>

        <div className="card">
          <h2 className="card-title">Staff Portal</h2>
          <p className="card-desc">
            Staff agents and administrators sign in to review, claim, assign, and resolve tickets.
          </p>
          <Link href="/login" className="btn btn-secondary">
            Staff sign in &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
