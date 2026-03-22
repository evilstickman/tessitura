-- Auth.js compatibility migration
-- Hand-rewritten to preserve existing user data (Migration Safety rule)

-- Make password_hash nullable (OAuth users won't have passwords)
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

-- Convert email_verified from boolean to timestamptz (Auth.js expects DateTime)
-- Preserves existing data: true → NOW(), false/null → NULL
ALTER TABLE "users"
  ALTER COLUMN "email_verified" DROP DEFAULT,
  ALTER COLUMN "email_verified" DROP NOT NULL,
  ALTER COLUMN "email_verified" TYPE timestamptz
    USING CASE WHEN "email_verified" THEN NOW() ELSE NULL END;

-- Make display_name nullable (OAuth users may not provide one initially)
ALTER TABLE "users" ALTER COLUMN "display_name" DROP NOT NULL;

-- Add image column for OAuth profile pictures
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "image" TEXT;

-- Add default for instruments array
ALTER TABLE "users" ALTER COLUMN "instruments" SET DEFAULT '{}';

-- Create accounts table for OAuth provider links
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- Create verification_tokens table for email verification flows
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- Create indexes
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- Add foreign key with cascade delete (removing user removes their OAuth links)
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
