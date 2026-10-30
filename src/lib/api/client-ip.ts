/**
 * Extracts client IP from request headers.
 * Note: x-forwarded-for and x-real-ip headers are only trustworthy when behind a trusted reverse proxy.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp?.trim()) {
    return realIp.trim();
  }
  return "unknown";
}
