-- CreateEnum
CREATE TYPE "asset_type" AS ENUM ('person', 'object', 'scene');

-- CreateEnum
CREATE TYPE "asset_review_status" AS ENUM ('draft', 'pending_review', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "asset_listing_status" AS ENUM ('unlisted', 'listed', 'delisted');

-- CreateEnum
CREATE TYPE "certification_status" AS ENUM ('not_started', 'pending_payment', 'pending_review', 'certifying', 'certified', 'exception');

-- CreateEnum
CREATE TYPE "asset_file_type" AS ENUM ('original', 'preview', 'thumbnail', 'person_proof', 'certificate_file', 'certificate_snapshot', 'download_bundle');

-- CreateEnum
CREATE TYPE "file_access_scope" AS ENUM ('private', 'public_preview', 'signed_download_only');

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL,
    "uploader_profile_id" UUID NOT NULL,
    "asset_type" "asset_type" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "review_status" "asset_review_status" NOT NULL DEFAULT 'draft',
    "listing_status" "asset_listing_status" NOT NULL DEFAULT 'unlisted',
    "certification_status" "certification_status" NOT NULL DEFAULT 'not_started',
    "price_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "rejection_reason" TEXT,
    "submitted_at" TIMESTAMPTZ(3),
    "reviewed_by_user_id" UUID,
    "reviewed_at" TIMESTAMPTZ(3),
    "listed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "assets_price_positive" CHECK ("price_cents" > 0),
    CONSTRAINT "assets_listed_requires_approval_and_certification" CHECK (
      "listing_status" <> 'listed'
      OR ("review_status" = 'approved' AND "certification_status" = 'certified')
    )
);

-- CreateTable
CREATE TABLE "asset_tags" (
    "id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "tag" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_files" (
    "id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "uploaded_by_user_id" UUID NOT NULL,
    "file_type" "asset_file_type" NOT NULL,
    "access_scope" "file_access_scope" NOT NULL,
    "cos_bucket" TEXT NOT NULL,
    "cos_region" TEXT NOT NULL,
    "cos_object_key" TEXT NOT NULL,
    "file_hash" TEXT NOT NULL,
    "file_size_bytes" BIGINT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "asset_files_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "asset_files_public_scope_is_derivative" CHECK (
      "access_scope" <> 'public_preview'
      OR "file_type" IN ('preview', 'thumbnail')
    )
);

-- CreateIndex
CREATE INDEX "assets_asset_type_listing_status_certification_status_idx" ON "assets"("asset_type", "listing_status", "certification_status");

-- CreateIndex
CREATE INDEX "assets_uploader_profile_id_created_at_idx" ON "assets"("uploader_profile_id", "created_at");

-- CreateIndex
CREATE INDEX "assets_review_status_created_at_idx" ON "assets"("review_status", "created_at");

-- CreateIndex
CREATE INDEX "assets_listing_status_listed_at_id_idx" ON "assets"("listing_status", "listed_at", "id");

-- CreateIndex
CREATE INDEX "asset_tags_tag_idx" ON "asset_tags"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "asset_tags_asset_id_tag_key" ON "asset_tags"("asset_id", "tag");

-- CreateIndex
CREATE INDEX "asset_files_asset_id_file_type_idx" ON "asset_files"("asset_id", "file_type");

-- CreateIndex
CREATE UNIQUE INDEX "asset_files_cos_bucket_cos_region_cos_object_key_key" ON "asset_files"("cos_bucket", "cos_region", "cos_object_key");

-- CreateIndex
CREATE INDEX "asset_files_file_hash_idx" ON "asset_files"("file_hash");

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_uploader_profile_id_fkey" FOREIGN KEY ("uploader_profile_id") REFERENCES "uploader_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_tags" ADD CONSTRAINT "asset_tags_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_files" ADD CONSTRAINT "asset_files_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_files" ADD CONSTRAINT "asset_files_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
