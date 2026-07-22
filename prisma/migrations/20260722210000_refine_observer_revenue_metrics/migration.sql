ALTER TABLE "platform_metric_snapshots"
ADD COLUMN "purchase_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "transaction_revenue_paid_cents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "transaction_revenue_refund_cents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "upload_fee_paid_cents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "upload_fee_refund_cents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "upload_revenue_cents" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "platform_asset_type_metric_snapshots"
ADD COLUMN "purchase_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "transaction_revenue_cents" INTEGER NOT NULL DEFAULT 0;
