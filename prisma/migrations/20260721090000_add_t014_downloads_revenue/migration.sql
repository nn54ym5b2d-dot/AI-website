-- AlterEnum
ALTER TYPE "download_bundle_status" ADD VALUE 'processing' AFTER 'pending';

-- AlterTable
ALTER TABLE "download_links"
ADD COLUMN "download_bundle_file_id" UUID,
ADD COLUMN "bundle_generated_at" TIMESTAMPTZ(3),
ADD COLUMN "bundle_failure_code" TEXT;

-- CreateTable
CREATE TABLE "downloads" (
    "id" UUID NOT NULL,
    "download_link_id" UUID NOT NULL,
    "authorization_record_id" UUID NOT NULL,
    "buyer_user_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "asset_file_id" UUID NOT NULL,
    "downloaded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_hash" TEXT,
    "user_agent_summary" TEXT,

    CONSTRAINT "downloads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "download_links_download_bundle_file_id_key" ON "download_links"("download_bundle_file_id");

-- CreateIndex
CREATE INDEX "downloads_buyer_user_id_downloaded_at_idx" ON "downloads"("buyer_user_id", "downloaded_at");

-- CreateIndex
CREATE INDEX "downloads_asset_id_downloaded_at_idx" ON "downloads"("asset_id", "downloaded_at");

-- CreateIndex
CREATE INDEX "downloads_download_link_id_downloaded_at_idx" ON "downloads"("download_link_id", "downloaded_at");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_records_one_initial_per_order_item"
ON "revenue_records"("order_item_id")
WHERE "record_type" = 'initial';

-- AddForeignKey
ALTER TABLE "download_links" ADD CONSTRAINT "download_links_download_bundle_file_id_fkey" FOREIGN KEY ("download_bundle_file_id") REFERENCES "asset_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_download_link_id_fkey" FOREIGN KEY ("download_link_id") REFERENCES "download_links"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_authorization_record_id_fkey" FOREIGN KEY ("authorization_record_id") REFERENCES "authorization_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_buyer_user_id_fkey" FOREIGN KEY ("buyer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_asset_file_id_fkey" FOREIGN KEY ("asset_file_id") REFERENCES "asset_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
