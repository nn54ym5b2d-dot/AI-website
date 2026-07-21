-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('pending_payment', 'paid', 'cancelled', 'payment_failed', 'refunded', 'partial_refunded');

-- CreateEnum
CREATE TYPE "payment_purpose" AS ENUM ('asset_purchase', 'certification_fee');

-- CreateEnum
CREATE TYPE "payment_provider" AS ENUM ('wechat_pay', 'alipay');

-- CreateEnum
CREATE TYPE "refund_purpose" AS ENUM ('asset_purchase', 'certification_fee');

-- CreateEnum
CREATE TYPE "authorization_status" AS ENUM ('active', 'revoked');

-- CreateEnum
CREATE TYPE "download_bundle_status" AS ENUM ('pending', 'ready', 'failed');

-- CreateEnum
CREATE TYPE "download_status" AS ENUM ('active', 'expired', 'revoked');

-- CreateEnum
CREATE TYPE "revenue_record_type" AS ENUM ('initial', 'reversal');

-- CreateEnum
CREATE TYPE "revenue_status" AS ENUM ('recorded', 'reversed', 'settled_pending', 'settled');

-- AlterTable
ALTER TABLE "system_settings" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "order_no" TEXT NOT NULL,
    "buyer_user_id" UUID NOT NULL,
    "status" "order_status" NOT NULL DEFAULT 'pending_payment',
    "total_amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "settings_snapshot" JSONB NOT NULL DEFAULT '{}',
    "paid_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "uploader_profile_id" UUID NOT NULL,
    "asset_title_snapshot" TEXT NOT NULL,
    "asset_type_snapshot" "asset_type" NOT NULL,
    "certification_status_snapshot" "certification_status" NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "payment_no" TEXT NOT NULL,
    "purpose" "payment_purpose" NOT NULL,
    "order_id" UUID,
    "certification_fee_charge_id" UUID,
    "payer_user_id" UUID NOT NULL,
    "provider" "payment_provider" NOT NULL,
    "provider_mode" TEXT NOT NULL DEFAULT 'local_test',
    "merchant_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "status" "payment_status" NOT NULL DEFAULT 'pending',
    "provider_trade_no" TEXT,
    "provider_payload_summary" JSONB NOT NULL DEFAULT '{}',
    "paid_at" TIMESTAMPTZ(3),
    "failed_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL,
    "refund_no" TEXT NOT NULL,
    "purpose" "refund_purpose" NOT NULL,
    "payment_id" UUID NOT NULL,
    "order_id" UUID,
    "certification_fee_charge_id" UUID,
    "certification_refund_request_id" UUID,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "reason" TEXT NOT NULL,
    "status" "refund_status" NOT NULL DEFAULT 'pending',
    "provider_refund_no" TEXT,
    "requested_by_user_id" UUID NOT NULL,
    "requested_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_by_user_id" UUID,
    "processed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_items" (
    "id" UUID NOT NULL,
    "refund_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refund_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authorization_records" (
    "id" UUID NOT NULL,
    "buyer_user_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "license_version" TEXT NOT NULL,
    "license_text_snapshot" TEXT NOT NULL,
    "certification_status_snapshot" "certification_status" NOT NULL,
    "asset_file_manifest_snapshot" JSONB NOT NULL,
    "status" "authorization_status" NOT NULL DEFAULT 'active',
    "granted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(3),
    "revoked_by_user_id" UUID,
    "revoke_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authorization_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "download_links" (
    "id" UUID NOT NULL,
    "authorization_record_id" UUID NOT NULL,
    "bundle_status" "download_bundle_status" NOT NULL DEFAULT 'pending',
    "requested_by_user_id" UUID NOT NULL,
    "eligibility_days_snapshot" INTEGER NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "status" "download_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "download_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_records" (
    "id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "record_type" "revenue_record_type" NOT NULL,
    "asset_id" UUID NOT NULL,
    "uploader_profile_id" UUID NOT NULL,
    "gross_amount_cents" INTEGER NOT NULL,
    "uploader_amount_cents" INTEGER NOT NULL,
    "platform_amount_cents" INTEGER NOT NULL,
    "uploader_share_rate" DECIMAL(6,4) NOT NULL,
    "platform_share_rate" DECIMAL(6,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "status" "revenue_status" NOT NULL DEFAULT 'recorded',
    "related_revenue_record_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" UUID NOT NULL,
    "provider" "payment_provider" NOT NULL,
    "provider_mode" TEXT NOT NULL DEFAULT 'local_test',
    "provider_event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payment_id" UUID,
    "refund_id" UUID,
    "payload_hash" TEXT NOT NULL,
    "processed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_no_key" ON "orders"("order_no");

-- CreateIndex
CREATE INDEX "orders_buyer_user_id_created_at_idx" ON "orders"("buyer_user_id", "created_at");

-- CreateIndex
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at");

-- CreateIndex
CREATE INDEX "order_items_asset_id_idx" ON "order_items"("asset_id");

-- CreateIndex
CREATE INDEX "order_items_uploader_profile_id_idx" ON "order_items"("uploader_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_order_id_asset_id_key" ON "order_items"("order_id", "asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_payment_no_key" ON "payments"("payment_no");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_trade_no_key" ON "payments"("provider_trade_no");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "payments_certification_fee_charge_id_idx" ON "payments"("certification_fee_charge_id");

-- CreateIndex
CREATE INDEX "payments_payer_user_id_created_at_idx" ON "payments"("payer_user_id", "created_at");

-- CreateIndex
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_refund_no_key" ON "refunds"("refund_no");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_certification_refund_request_id_key" ON "refunds"("certification_refund_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_provider_refund_no_key" ON "refunds"("provider_refund_no");

-- CreateIndex
CREATE INDEX "refunds_payment_id_created_at_idx" ON "refunds"("payment_id", "created_at");

-- CreateIndex
CREATE INDEX "refunds_order_id_idx" ON "refunds"("order_id");

-- CreateIndex
CREATE INDEX "refunds_certification_fee_charge_id_idx" ON "refunds"("certification_fee_charge_id");

-- CreateIndex
CREATE INDEX "refunds_status_created_at_idx" ON "refunds"("status", "created_at");

-- CreateIndex
CREATE INDEX "refund_items_order_item_id_idx" ON "refund_items"("order_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "refund_items_refund_id_order_item_id_key" ON "refund_items"("refund_id", "order_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "authorization_records_order_item_id_key" ON "authorization_records"("order_item_id");

-- CreateIndex
CREATE INDEX "authorization_records_buyer_user_id_granted_at_idx" ON "authorization_records"("buyer_user_id", "granted_at");

-- CreateIndex
CREATE INDEX "authorization_records_asset_id_idx" ON "authorization_records"("asset_id");

-- CreateIndex
CREATE INDEX "authorization_records_status_created_at_idx" ON "authorization_records"("status", "created_at");

-- CreateIndex
CREATE INDEX "download_links_requested_by_user_id_created_at_idx" ON "download_links"("requested_by_user_id", "created_at");

-- CreateIndex
CREATE INDEX "download_links_status_expires_at_idx" ON "download_links"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "download_links_authorization_record_id_key" ON "download_links"("authorization_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_records_related_revenue_record_id_key" ON "revenue_records"("related_revenue_record_id");

-- CreateIndex
CREATE INDEX "revenue_records_order_item_id_idx" ON "revenue_records"("order_item_id");

-- CreateIndex
CREATE INDEX "revenue_records_uploader_profile_id_created_at_idx" ON "revenue_records"("uploader_profile_id", "created_at");

-- CreateIndex
CREATE INDEX "revenue_records_asset_id_idx" ON "revenue_records"("asset_id");

-- CreateIndex
CREATE INDEX "revenue_records_status_created_at_idx" ON "revenue_records"("status", "created_at");

-- CreateIndex
CREATE INDEX "webhook_events_payment_id_idx" ON "webhook_events"("payment_id");

-- CreateIndex
CREATE INDEX "webhook_events_refund_id_idx" ON "webhook_events"("refund_id");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_provider_provider_event_id_key" ON "webhook_events"("provider", "provider_event_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_user_id_fkey" FOREIGN KEY ("buyer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_uploader_profile_id_fkey" FOREIGN KEY ("uploader_profile_id") REFERENCES "uploader_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_certification_fee_charge_id_fkey" FOREIGN KEY ("certification_fee_charge_id") REFERENCES "certification_fee_charges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_payer_user_id_fkey" FOREIGN KEY ("payer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_certification_fee_charge_id_fkey" FOREIGN KEY ("certification_fee_charge_id") REFERENCES "certification_fee_charges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_certification_refund_request_id_fkey" FOREIGN KEY ("certification_refund_request_id") REFERENCES "certification_refund_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_processed_by_user_id_fkey" FOREIGN KEY ("processed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_refund_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "refunds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorization_records" ADD CONSTRAINT "authorization_records_buyer_user_id_fkey" FOREIGN KEY ("buyer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorization_records" ADD CONSTRAINT "authorization_records_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorization_records" ADD CONSTRAINT "authorization_records_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorization_records" ADD CONSTRAINT "authorization_records_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorization_records" ADD CONSTRAINT "authorization_records_revoked_by_user_id_fkey" FOREIGN KEY ("revoked_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "download_links" ADD CONSTRAINT "download_links_authorization_record_id_fkey" FOREIGN KEY ("authorization_record_id") REFERENCES "authorization_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "download_links" ADD CONSTRAINT "download_links_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_records" ADD CONSTRAINT "revenue_records_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_records" ADD CONSTRAINT "revenue_records_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_records" ADD CONSTRAINT "revenue_records_uploader_profile_id_fkey" FOREIGN KEY ("uploader_profile_id") REFERENCES "uploader_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_records" ADD CONSTRAINT "revenue_records_related_revenue_record_id_fkey" FOREIGN KEY ("related_revenue_record_id") REFERENCES "revenue_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_refund_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "refunds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "asset_derivative_jobs_source_file_id_watermark_template_version" RENAME TO "asset_derivative_jobs_source_file_id_watermark_template_ver_key";

-- Business invariants that Prisma cannot express directly.
ALTER TABLE "orders" ADD CONSTRAINT "orders_total_amount_positive" CHECK ("total_amount_cents" > 0);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_price_positive" CHECK ("price_cents" > 0);
ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_positive" CHECK ("amount_cents" > 0);
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_amount_positive" CHECK ("amount_cents" > 0);
ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_amount_positive" CHECK ("amount_cents" > 0);
ALTER TABLE "download_links" ADD CONSTRAINT "download_links_eligibility_days_positive" CHECK ("eligibility_days_snapshot" > 0);

ALTER TABLE "payments" ADD CONSTRAINT "payments_purpose_target_check" CHECK (
  ("purpose" = 'asset_purchase' AND "order_id" IS NOT NULL AND "certification_fee_charge_id" IS NULL)
  OR
  ("purpose" = 'certification_fee' AND "order_id" IS NULL AND "certification_fee_charge_id" IS NOT NULL)
);
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_purpose_target_check" CHECK (
  ("purpose" = 'asset_purchase' AND "order_id" IS NOT NULL AND "certification_fee_charge_id" IS NULL)
  OR
  ("purpose" = 'certification_fee' AND "order_id" IS NULL AND "certification_fee_charge_id" IS NOT NULL)
);

CREATE UNIQUE INDEX "payments_success_order_key"
  ON "payments"("order_id")
  WHERE "purpose" = 'asset_purchase' AND "status" IN ('success', 'refunded');
CREATE UNIQUE INDEX "payments_success_certification_fee_key"
  ON "payments"("certification_fee_charge_id")
  WHERE "purpose" = 'certification_fee' AND "status" IN ('success', 'refunded');
CREATE UNIQUE INDEX "authorization_records_active_buyer_asset_key"
  ON "authorization_records"("buyer_user_id", "asset_id")
  WHERE "status" = 'active';
CREATE UNIQUE INDEX "revenue_records_initial_order_item_key"
  ON "revenue_records"("order_item_id")
  WHERE "record_type" = 'initial';
