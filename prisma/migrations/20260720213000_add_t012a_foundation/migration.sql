ALTER TABLE "invite_codes" ADD COLUMN "note" TEXT;

ALTER TABLE "certification_fee_charges"
ADD COLUMN "settings_snapshot" JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE "system_settings" (
  "id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "description" TEXT,
  "updated_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

ALTER TABLE "system_settings"
ADD CONSTRAINT "system_settings_updated_by_user_id_fkey"
FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
