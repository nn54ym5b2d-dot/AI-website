-- Backfill the buyer capability for every active uploader.
-- Uploading is an additional business qualification, not a replacement for buying.
INSERT INTO "user_role_memberships" (
    "id",
    "user_id",
    "role",
    "status",
    "created_at",
    "updated_at"
)
SELECT
    gen_random_uuid(),
    uploader."user_id",
    'buyer'::"user_role",
    'active'::"user_status",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "user_role_memberships" AS uploader
WHERE uploader."role" = 'uploader'::"user_role"
  AND uploader."status" = 'active'::"user_status"
ON CONFLICT ("user_id", "role") DO UPDATE
SET "status" = 'active'::"user_status",
    "updated_at" = CURRENT_TIMESTAMP;
