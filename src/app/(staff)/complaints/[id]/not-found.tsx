import Link from "next/link";

export default function ComplaintNotFound() {
  return (
    <div style={{ maxWidth: "560px", margin: "3rem auto", textAlign: "center" }}>
      <div className="card">
        <h1 className="card-title" style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>
          Complaint Not Found
        </h1>
        <p className="card-desc">
          We could not find the complaint you were looking for. It may have been deleted or the reference identifier is invalid.
        </p>
        <Link href="/dashboard" className="btn btn-primary">
          &larr; Return to dashboard
        </Link>
      </div>
    </div>
  );
}
