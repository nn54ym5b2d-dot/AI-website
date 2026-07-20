-- T012 keeps review, certification, listing and audit transitions in PostgreSQL.

CREATE TYPE "refund_status" AS ENUM ('pending', 'success', 'failed', 'cancelled');

ALTER TABLE "assets"
ADD COLUMN "category" TEXT;

CREATE TABLE "asset_review_events" (
    "id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "from_status" "asset_review_status",
    "to_status" "asset_review_status" NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "asset_review_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "certification_records" (
    "id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "status" "certification_status" NOT NULL DEFAULT 'certifying',
    "government_site_name" TEXT,
    "certificate_no" TEXT,
    "credential" TEXT,
    "certificate_file_id" UUID,
    "certificate_snapshot_file_id" UUID,
    "certificate_issued_at" TIMESTAMPTZ(3),
    "certification_started_at" TIMESTAMPTZ(3),
    "verified_by_user_id" UUID,
    "verified_at" TIMESTAMPTZ(3),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "certification_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "certification_records_certified_fields" CHECK (
      "status" <> 'certified'
      OR ("certificate_no" IS NOT NULL AND "certificate_file_id" IS NOT NULL)
    )
);

CREATE TABLE "certification_refund_requests" (
    "id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "certification_fee_charge_id" UUID NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "reason" TEXT NOT NULL,
    "status" "refund_status" NOT NULL DEFAULT 'pending',
    "requested_by_user_id" UUID NOT NULL,
    "requested_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "certification_refund_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "certification_refund_requests_amount_positive" CHECK ("amount_cents" > 0)
);

CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" UUID,
    "asset_id" UUID,
    "request_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "certification_records_asset_id_key" ON "certification_records"("asset_id");
CREATE INDEX "certification_records_status_created_at_idx" ON "certification_records"("status", "created_at");
CREATE INDEX "asset_review_events_asset_id_created_at_idx" ON "asset_review_events"("asset_id", "created_at");
CREATE INDEX "asset_review_events_actor_user_id_created_at_idx" ON "asset_review_events"("actor_user_id", "created_at");
CREATE UNIQUE INDEX "certification_refund_requests_asset_id_key" ON "certification_refund_requests"("asset_id");
CREATE UNIQUE INDEX "certification_refund_requests_certification_fee_charge_id_key" ON "certification_refund_requests"("certification_fee_charge_id");
CREATE INDEX "certification_refund_requests_status_requested_at_idx" ON "certification_refund_requests"("status", "requested_at");
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");
CREATE INDEX "audit_logs_asset_id_created_at_idx" ON "audit_logs"("asset_id", "created_at");
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

ALTER TABLE "asset_review_events" ADD CONSTRAINT "asset_review_events_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "asset_review_events" ADD CONSTRAINT "asset_review_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "certification_records" ADD CONSTRAINT "certification_records_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "certification_records" ADD CONSTRAINT "certification_records_certificate_file_id_fkey" FOREIGN KEY ("certificate_file_id") REFERENCES "asset_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "certification_records" ADD CONSTRAINT "certification_records_certificate_snapshot_file_id_fkey" FOREIGN KEY ("certificate_snapshot_file_id") REFERENCES "asset_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "certification_records" ADD CONSTRAINT "certification_records_verified_by_user_id_fkey" FOREIGN KEY ("verified_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "certification_refund_requests" ADD CONSTRAINT "certification_refund_requests_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "certification_refund_requests" ADD CONSTRAINT "certification_refund_requests_certification_fee_charge_id_fkey" FOREIGN KEY ("certification_fee_charge_id") REFERENCES "certification_fee_charges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "certification_refund_requests" ADD CONSTRAINT "certification_refund_requests_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "upload_intents"
DROP CONSTRAINT "upload_intents_uploadable_type";

ALTER TABLE "upload_intents"
ADD CONSTRAINT "upload_intents_uploadable_type"
CHECK ("file_type" IN ('original', 'person_proof', 'supporting_proof', 'certificate_file', 'certificate_snapshot'));

ALTER TABLE "assets"
ADD CONSTRAINT "assets_listed_state_guard"
CHECK (
  "listing_status" <> 'listed'
  OR ("review_status" = 'approved' AND "certification_status" = 'certified')
);
