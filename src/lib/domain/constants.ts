export const COMPLAINT_CATEGORIES = [
  "Billing",
  "Service",
  "Product",
  "Delivery",
  "Other",
] as const;

export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number];
