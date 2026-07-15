-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('active', 'disabled', 'deleted');

-- CreateEnum
CREATE TYPE "auth_provider" AS ENUM ('phone', 'email', 'wechat');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('buyer', 'uploader', 'admin', 'observer');

-- CreateEnum
CREATE TYPE "admin_role" AS ENUM ('super_admin', 'operator', 'finance');

-- CreateEnum
CREATE TYPE "invite_code_status" AS ENUM ('unused', 'used', 'disabled', 'expired');

-- CreateEnum
CREATE TYPE "legal_document_type" AS ENUM ('terms_of_service', 'privacy_policy', 'commercial_license');

-- CreateEnum
CREATE TYPE "auth_challenge_purpose" AS ENUM ('register', 'login');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "avatar_url" TEXT,
    "primary_login_method" "auth_provider" NOT NULL,
    "status" "user_status" NOT NULL DEFAULT 'active',
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_identities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" "auth_provider" NOT NULL,
    "provider_subject" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_document_versions" (
    "id" UUID NOT NULL,
    "document_type" "legal_document_type" NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "effective_at" TIMESTAMPTZ(3) NOT NULL,
    "retired_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_terms_acceptances" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "legal_document_version_id" UUID NOT NULL,
    "accepted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "request_id" TEXT,

    CONSTRAINT "user_terms_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role_memberships" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "user_role" NOT NULL,
    "status" "user_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_role_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uploader_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "invite_code_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "bio" TEXT,
    "status" "user_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "uploader_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite_codes" (
    "id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "display_prefix" TEXT NOT NULL,
    "status" "invite_code_status" NOT NULL DEFAULT 'unused',
    "created_by_user_id" UUID NOT NULL,
    "used_by_user_id" UUID,
    "used_at" TIMESTAMPTZ(3),
    "expires_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "invite_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_role_assignments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "admin_role" "admin_role" NOT NULL,
    "status" "user_status" NOT NULL DEFAULT 'active',
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "admin_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observer_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "partner_name" TEXT NOT NULL,
    "default_share_rate" DECIMAL(6,4) NOT NULL DEFAULT 0,
    "status" "user_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "observer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "csrf_token_hash" TEXT,
    "csrf_expires_at" TIMESTAMPTZ(3),
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_challenges" (
    "id" UUID NOT NULL,
    "provider" "auth_provider" NOT NULL,
    "identifier" TEXT NOT NULL,
    "identifier_hash" TEXT NOT NULL,
    "purpose" "auth_challenge_purpose" NOT NULL,
    "code_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "consumed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_status_created_at_idx" ON "users"("status", "created_at");

-- CreateIndex
CREATE INDEX "auth_identities_user_id_provider_idx" ON "auth_identities"("user_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_provider_provider_subject_key" ON "auth_identities"("provider", "provider_subject");

-- CreateIndex
CREATE INDEX "legal_document_versions_document_type_effective_at_retired__idx" ON "legal_document_versions"("document_type", "effective_at", "retired_at");

-- CreateIndex
CREATE UNIQUE INDEX "legal_document_versions_document_type_version_key" ON "legal_document_versions"("document_type", "version");

-- CreateIndex
CREATE INDEX "user_terms_acceptances_user_id_accepted_at_idx" ON "user_terms_acceptances"("user_id", "accepted_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_terms_acceptances_user_id_legal_document_version_id_key" ON "user_terms_acceptances"("user_id", "legal_document_version_id");

-- CreateIndex
CREATE INDEX "user_role_memberships_role_status_idx" ON "user_role_memberships"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "user_role_memberships_user_id_role_key" ON "user_role_memberships"("user_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "uploader_profiles_user_id_key" ON "uploader_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uploader_profiles_invite_code_id_key" ON "uploader_profiles"("invite_code_id");

-- CreateIndex
CREATE UNIQUE INDEX "invite_codes_code_hash_key" ON "invite_codes"("code_hash");

-- CreateIndex
CREATE INDEX "invite_codes_status_expires_at_idx" ON "invite_codes"("status", "expires_at");

-- CreateIndex
CREATE INDEX "admin_role_assignments_admin_role_status_idx" ON "admin_role_assignments"("admin_role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "admin_role_assignments_user_id_admin_role_key" ON "admin_role_assignments"("user_id", "admin_role");

-- CreateIndex
CREATE UNIQUE INDEX "observer_profiles_user_id_key" ON "observer_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_token_hash_key" ON "user_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_expires_at_idx" ON "user_sessions"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "user_sessions_expires_at_revoked_at_idx" ON "user_sessions"("expires_at", "revoked_at");

-- CreateIndex
CREATE INDEX "auth_challenges_identifier_hash_purpose_created_at_idx" ON "auth_challenges"("identifier_hash", "purpose", "created_at");

-- CreateIndex
CREATE INDEX "auth_challenges_expires_at_consumed_at_idx" ON "auth_challenges"("expires_at", "consumed_at");

-- AddForeignKey
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_terms_acceptances" ADD CONSTRAINT "user_terms_acceptances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_terms_acceptances" ADD CONSTRAINT "user_terms_acceptances_legal_document_version_id_fkey" FOREIGN KEY ("legal_document_version_id") REFERENCES "legal_document_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_memberships" ADD CONSTRAINT "user_role_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploader_profiles" ADD CONSTRAINT "uploader_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploader_profiles" ADD CONSTRAINT "uploader_profiles_invite_code_id_fkey" FOREIGN KEY ("invite_code_id") REFERENCES "invite_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_used_by_user_id_fkey" FOREIGN KEY ("used_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_role_assignments" ADD CONSTRAINT "admin_role_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_role_assignments" ADD CONSTRAINT "admin_role_assignments_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observer_profiles" ADD CONSTRAINT "observer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
