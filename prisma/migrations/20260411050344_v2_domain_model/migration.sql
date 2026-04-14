-- CreateEnum
CREATE TYPE "GridType" AS ENUM ('REPERTOIRE', 'TECHNIQUE');

-- CreateEnum
CREATE TYPE "SessionSource" AS ENUM ('MANUAL', 'INFERRED');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('DAILY_MINUTES', 'WEEKLY_MINUTES', 'WEEKLY_SESSIONS', 'MONTHLY_GRIDS');

-- CreateEnum
CREATE TYPE "TierRequired" AS ENUM ('FREE', 'PRO');

-- AlterTable
ALTER TABLE "practice_grids" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "grid_type" "GridType" NOT NULL DEFAULT 'REPERTOIRE',
ADD COLUMN     "source_template_id" UUID;

-- CreateTable
CREATE TABLE "practice_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "practice_grid_id" UUID,
    "session_date" DATE NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "notes" TEXT,
    "source" "SessionSource" NOT NULL DEFAULT 'MANUAL',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "practice_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_goals" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "goal_type" "GoalType" NOT NULL,
    "target_value" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "practice_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_templates" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "collection" TEXT NOT NULL,
    "description" TEXT,
    "instrument_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "grid_type" "GridType" NOT NULL DEFAULT 'REPERTOIRE',
    "tier_required" "TierRequired" NOT NULL DEFAULT 'FREE',
    "grid_data" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "library_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "practice_sessions_user_id_session_date_idx" ON "practice_sessions"("user_id", "session_date");

-- CreateIndex
CREATE INDEX "practice_goals_user_id_idx" ON "practice_goals"("user_id");

-- CreateIndex
CREATE INDEX "practice_grids_user_id_archived_idx" ON "practice_grids"("user_id", "archived");

-- CreateIndex
CREATE INDEX "practice_grids_source_template_id_idx" ON "practice_grids"("source_template_id");

-- AddForeignKey
ALTER TABLE "practice_grids" ADD CONSTRAINT "practice_grids_source_template_id_fkey" FOREIGN KEY ("source_template_id") REFERENCES "library_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_practice_grid_id_fkey" FOREIGN KEY ("practice_grid_id") REFERENCES "practice_grids"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_goals" ADD CONSTRAINT "practice_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
