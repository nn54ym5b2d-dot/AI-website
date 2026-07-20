-- CreateEnum
CREATE TYPE "upload_intent_status" AS ENUM ('pending', 'completed', 'expired', 'rejected');

-- CreateEnum
CREATE TYPE "asset_processing_status" AS ENUM ('pending', 'processing', 'ready', 'failed');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('pending', 'success', 'failed', 'closed', 'refunded');

-- CreateTable
CREATE TABLE "upload_intents" (
    "id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "file_type" "asset_file_type" NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "upload_intent_status" NOT NULL DEFAULT 'pending',
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "sha256" TEXT NOT NULL,
    "staging_bucket" TEXT NOT NULL,
    "staging_region" TEXT NOT NULL,
    "staging_object_key" TEXT NOT NULL,
    "final_bucket" TEXT NOT NULL,
    "final_region" TEXT NOT NULL,
    "final_object_key" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "completed_at" TIMESTAMPTZ(3),
    "asset_file_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "upload_intents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "upload_intents_uploadable_type" CHECK ("file_type" IN ('original', 'person_proof')),
    CONSTRAINT "upload_intents_size_positive" CHECK ("size_bytes" > 0)
);

-- CreateTable
CREATE TABLE "asset_derivative_jobs" (
    "id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "source_file_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "asset_processing_status" NOT NULL DEFAULT 'pending',
    "watermark_template_version" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error_code" TEXT,
    "started_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "asset_derivative_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certification_fee_charges" (
    "id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "uploader_user_id" UUID NOT NULL,
    "amount_cents" INTEGER NOT NULL DEFAULT 1000,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "status" "payment_status" NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "certification_fee_charges_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "certification_fee_charges_amount_positive" CHECK ("amount_cents" > 0)
);

-- CreateTable
CREATE TABLE "idempotency_records" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "idempotency_key_hash" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "response_resource_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upload_intents_asset_file_id_key" ON "upload_intents"("asset_file_id");

-- CreateIndex
CREATE UNIQUE INDEX "upload_intents_staging_bucket_staging_region_staging_object_key_key" ON "upload_intents"("staging_bucket", "staging_region", "staging_object_key");

-- CreateIndex
CREATE UNIQUE INDEX "upload_intents_final_bucket_final_region_final_object_key_key" ON "upload_intents"("final_bucket", "final_region", "final_object_key");

-- CreateIndex
CREATE INDEX "upload_intents_asset_id_status_created_at_idx" ON "upload_intents"("asset_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "upload_intents_user_id_created_at_idx" ON "upload_intents"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "upload_intents_expires_at_status_idx" ON "upload_intents"("expires_at", "status");

-- CreateIndex
CREATE UNIQUE INDEX "asset_derivative_jobs_source_file_id_watermark_template_version_key" ON "asset_derivative_jobs"("source_file_id", "watermark_template_version");

-- CreateIndex
CREATE INDEX "asset_derivative_jobs_asset_id_status_created_at_idx" ON "asset_derivative_jobs"("asset_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "asset_derivative_jobs_status_created_at_idx" ON "asset_derivative_jobs"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "certification_fee_charges_asset_id_key" ON "certification_fee_charges"("asset_id");

-- CreateIndex
CREATE INDEX "certification_fee_charges_uploader_user_id_created_at_idx" ON "certification_fee_charges"("uploader_user_id", "created_at");

-- CreateIndex
CREATE INDEX "certification_fee_charges_status_created_at_idx" ON "certification_fee_charges"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_records_user_id_endpoint_idempotency_key_hash_key" ON "idempotency_records"("user_id", "endpoint", "idempotency_key_hash");

-- CreateIndex
CREATE INDEX "idempotency_records_expires_at_idx" ON "idempotency_records"("expires_at");

-- AddForeignKey
ALTER TABLE "upload_intents" ADD CONSTRAINT "upload_intents_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_intents" ADD CONSTRAINT "upload_intents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_intents" ADD CONSTRAINT "upload_intents_asset_file_id_fkey" FOREIGN KEY ("asset_file_id") REFERENCES "asset_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_derivative_jobs" ADD CONSTRAINT "asset_derivative_jobs_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_derivative_jobs" ADD CONSTRAINT "asset_derivative_jobs_source_file_id_fkey" FOREIGN KEY ("source_file_id") REFERENCES "asset_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certification_fee_charges" ADD CONSTRAINT "certification_fee_charges_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certification_fee_charges" ADD CONSTRAINT "certification_fee_charges_uploader_user_id_fkey" FOREIGN KEY ("uploader_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
