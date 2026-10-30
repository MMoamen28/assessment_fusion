import Link from "next/link";

export default function TrackNotFound() {
  return (
    <div style={{ maxWidth: "520px", margin: "3rem auto", textAlign: "center" }}>
      <div className="card">
        <h1 className="card-title" style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>
          We could not find that complaint
        </h1>
        <p className="card-desc">
          The tracking link you used may be invalid, expired, or typed incorrectly.
        </p>
        <Link href="/track" className="btn btn-primary">
          Look up by reference number &rarr;
        </Link>
      </div>
    </div>
  );
}
