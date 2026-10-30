const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
  hour12: false,
});

export function formatDateTime(iso: string | Date): string {
  if (!iso) return "";
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(date.getTime())) {
    return "";
  }
  return `${dateTimeFormatter.format(date)} UTC`;
}
