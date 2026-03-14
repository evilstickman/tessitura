-- CreateEnum
CREATE TYPE "FreshnessResetStrategy" AS ENUM ('FULL', 'HALVE');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "instruments" TEXT[],
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "default_fade_enabled" BOOLEAN NOT NULL DEFAULT true,
    "freshness_reset_strategy" "FreshnessResetStrategy" NOT NULL DEFAULT 'FULL',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_grids" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "fade_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "practice_grids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_rows" (
    "id" UUID NOT NULL,
    "practice_grid_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "song_title" TEXT,
    "composer" TEXT,
    "part" TEXT,
    "start_measure" INTEGER NOT NULL,
    "end_measure" INTEGER NOT NULL,
    "target_tempo" INTEGER NOT NULL,
    "steps" INTEGER NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "practice_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_cells" (
    "id" UUID NOT NULL,
    "practice_row_id" UUID NOT NULL,
    "step_number" INTEGER NOT NULL,
    "target_tempo_percentage" DOUBLE PRECISION NOT NULL,
    "freshness_interval_days" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "practice_cells_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_cell_completions" (
    "id" UUID NOT NULL,
    "practice_cell_id" UUID NOT NULL,
    "completion_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "practice_cell_completions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "practice_cell_completions_practice_cell_id_completion_date_key" ON "practice_cell_completions"("practice_cell_id", "completion_date");

-- AddForeignKey
ALTER TABLE "practice_grids" ADD CONSTRAINT "practice_grids_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_rows" ADD CONSTRAINT "practice_rows_practice_grid_id_fkey" FOREIGN KEY ("practice_grid_id") REFERENCES "practice_grids"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_cells" ADD CONSTRAINT "practice_cells_practice_row_id_fkey" FOREIGN KEY ("practice_row_id") REFERENCES "practice_rows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_cell_completions" ADD CONSTRAINT "practice_cell_completions_practice_cell_id_fkey" FOREIGN KEY ("practice_cell_id") REFERENCES "practice_cells"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
