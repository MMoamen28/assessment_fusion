import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ maxWidth: "500px", margin: "4rem auto", textAlign: "center" }}>
      <div className="card">
        <h1 className="card-title" style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
          Page Not Found
        </h1>
        <p className="card-desc">
          The page or complaint you are looking for does not exist or has been moved.
        </p>
        <Link href="/" className="btn btn-primary">
          Return to home page
        </Link>
      </div>
    </div>
  );
}
