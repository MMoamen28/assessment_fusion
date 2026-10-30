-- CreateExtension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "complaint_title_trgm_idx" ON "Complaint" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "complaint_reference_trgm_idx" ON "Complaint" USING gin ("reference" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "complaint_submitter_name_trgm_idx" ON "Complaint" USING gin ("submitterName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "complaint_submitter_email_trgm_idx" ON "Complaint" USING gin ("submitterEmail" gin_trgm_ops);

-- AddCheckConstraints
ALTER TABLE "Complaint" ADD CONSTRAINT "complaint_version_nonneg" CHECK ("version" >= 0);
ALTER TABLE "Complaint" ADD CONSTRAINT "complaint_category_valid" CHECK ("category" IN ('Billing', 'Service', 'Product', 'Delivery', 'Other'));
ALTER TABLE "Complaint" ADD CONSTRAINT "complaint_title_length" CHECK (char_length(trim("title")) >= 1 AND char_length("title") <= 200);
ALTER TABLE "Complaint" ADD CONSTRAINT "complaint_description_length" CHECK (char_length(trim("description")) >= 10 AND char_length("description") <= 5000);
ALTER TABLE "Complaint" ADD CONSTRAINT "complaint_submitter_name_length" CHECK (char_length(trim("submitterName")) >= 1 AND char_length("submitterName") <= 100);
ALTER TABLE "Complaint" ADD CONSTRAINT "complaint_submitter_email_length" CHECK (char_length(trim("submitterEmail")) >= 1 AND char_length("submitterEmail") <= 255);
ALTER TABLE "Complaint" ADD CONSTRAINT "complaint_public_token_length" CHECK (char_length("publicToken") >= 20);
ALTER TABLE "Complaint" ADD CONSTRAINT "complaint_reference_format" CHECK ("reference" ~ '^CMP-[A-HJ-NP-Z2-9]{6}$');
ALTER TABLE "Complaint" ADD CONSTRAINT "complaint_assignment_invariant" CHECK (
  ("status" <> 'OPEN' OR "assigneeId" IS NULL)
  AND ("status" NOT IN ('IN_REVIEW', 'RESOLVED', 'CLOSED') OR "assigneeId" IS NOT NULL)
);

ALTER TABLE "Comment" ADD CONSTRAINT "comment_body_length" CHECK (char_length(trim("body")) >= 1 AND char_length("body") <= 2000);
