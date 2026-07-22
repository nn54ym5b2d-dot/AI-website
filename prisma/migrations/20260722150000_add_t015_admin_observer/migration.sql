CREATE TYPE "snapshot_period_type" AS ENUM ('day', 'week', 'month', 'custom');
CREATE TYPE "observer_share_status" AS ENUM ('pending_confirm', 'pending_settlement', 'settled', 'reversed');

CREATE TABLE "platform_metric_snapshots" (
    "id" UUID NOT NULL,
    "period_type" "snapshot_period_type" NOT NULL,
    "period_start" TIMESTAMPTZ(3) NOT NULL,
    "period_end" TIMESTAMPTZ(3) NOT NULL,
    "total_uploaded_assets" INTEGER NOT NULL,
    "new_uploaded_assets" INTEGER NOT NULL,
    "listed_assets" INTEGER NOT NULL,
    "delisted_assets" INTEGER NOT NULL,
    "pending_review_assets" INTEGER NOT NULL,
    "certified_assets" INTEGER NOT NULL,
    "certification_exception_assets" INTEGER NOT NULL,
    "person_asset_count" INTEGER NOT NULL,
    "object_asset_count" INTEGER NOT NULL,
    "scene_asset_count" INTEGER NOT NULL,
    "total_downloads" INTEGER NOT NULL,
    "paid_downloads" INTEGER NOT NULL,
    "paid_order_count" INTEGER NOT NULL,
    "refunded_order_count" INTEGER NOT NULL,
    "authorization_record_count" INTEGER NOT NULL,
    "gross_order_amount_cents" INTEGER NOT NULL,
    "paid_order_amount_cents" INTEGER NOT NULL,
    "refund_amount_cents" INTEGER NOT NULL,
    "net_revenue_cents" INTEGER NOT NULL,
    "platform_share_amount_cents" INTEGER NOT NULL,
    "uploader_share_amount_cents" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "platform_metric_snapshots_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "platform_metric_snapshots_period_order_check" CHECK ("period_end" > "period_start")
);

CREATE TABLE "platform_asset_type_metric_snapshots" (
    "id" UUID NOT NULL,
    "metric_snapshot_id" UUID NOT NULL,
    "asset_type" "asset_type" NOT NULL,
    "uploaded_assets" INTEGER NOT NULL,
    "listed_assets" INTEGER NOT NULL,
    "certified_assets" INTEGER NOT NULL,
    "downloads" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "platform_asset_type_metric_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "observer_share_records" (
    "id" UUID NOT NULL,
    "observer_profile_id" UUID NOT NULL,
    "metric_snapshot_id" UUID NOT NULL,
    "period_start" TIMESTAMPTZ(3) NOT NULL,
    "period_end" TIMESTAMPTZ(3) NOT NULL,
    "share_base_amount_cents" INTEGER NOT NULL,
    "share_rate" DECIMAL(6,4) NOT NULL DEFAULT 0,
    "expected_share_amount_cents" INTEGER NOT NULL DEFAULT 0,
    "settled_share_amount_cents" INTEGER NOT NULL DEFAULT 0,
    "pending_share_amount_cents" INTEGER NOT NULL DEFAULT 0,
    "status" "observer_share_status" NOT NULL DEFAULT 'pending_confirm',
    "handled_by_user_id" UUID,
    "settled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "observer_share_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_metric_snapshots_period_type_period_start_period_end_key"
ON "platform_metric_snapshots"("period_type", "period_start", "period_end");
CREATE INDEX "platform_metric_snapshots_period_start_period_end_idx"
ON "platform_metric_snapshots"("period_start", "period_end");
CREATE UNIQUE INDEX "platform_asset_type_metric_snapshots_metric_snapshot_id_asset_type_key"
ON "platform_asset_type_metric_snapshots"("metric_snapshot_id", "asset_type");
CREATE INDEX "platform_asset_type_metric_snapshots_asset_type_created_at_idx"
ON "platform_asset_type_metric_snapshots"("asset_type", "created_at");
CREATE UNIQUE INDEX "observer_share_records_observer_profile_id_metric_snapshot_id_key"
ON "observer_share_records"("observer_profile_id", "metric_snapshot_id");
CREATE INDEX "observer_share_records_observer_profile_id_period_start_period_end_idx"
ON "observer_share_records"("observer_profile_id", "period_start", "period_end");
CREATE INDEX "observer_share_records_status_created_at_idx"
ON "observer_share_records"("status", "created_at");

ALTER TABLE "platform_asset_type_metric_snapshots"
ADD CONSTRAINT "platform_asset_type_metric_snapshots_metric_snapshot_id_fkey"
FOREIGN KEY ("metric_snapshot_id") REFERENCES "platform_metric_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "observer_share_records"
ADD CONSTRAINT "observer_share_records_observer_profile_id_fkey"
FOREIGN KEY ("observer_profile_id") REFERENCES "observer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "observer_share_records"
ADD CONSTRAINT "observer_share_records_metric_snapshot_id_fkey"
FOREIGN KEY ("metric_snapshot_id") REFERENCES "platform_metric_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "observer_share_records"
ADD CONSTRAINT "observer_share_records_handled_by_user_id_fkey"
FOREIGN KEY ("handled_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
