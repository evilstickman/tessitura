-- Data-preserving migration: normalize song data from practice_rows into pieces table
--
-- Strategy:
--   1. Create the pieces table
--   2. Add piece_id column to practice_rows (nullable, no FK yet)
--   3. Insert deduplicated pieces from existing practice_rows data
--      - Deduplication key: (user_id, COALESCE(song_title,''), COALESCE(composer,''), COALESCE(part,''))
--      - user_id is resolved via JOIN through practice_grids
--      - Only rows that have at least a song_title get a piece created
--   4. Populate practice_rows.piece_id with the matching piece
--   5. Add the foreign key constraint
--   6. Drop the now-redundant song_title, composer, part columns

-- Step 1: Create pieces table
CREATE TABLE "pieces" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "composer" TEXT,
    "part" TEXT,
    "study_reference" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "pieces_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "pieces" ADD CONSTRAINT "pieces_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 2: Add piece_id column (no FK yet — we populate first)
ALTER TABLE "practice_rows" ADD COLUMN "piece_id" UUID;

-- Step 3: Insert deduplicated pieces from existing row data
-- Only creates pieces for rows that have a non-null, non-empty song_title.
-- Deduplication is by (user_id, title, composer, part) so the same song
-- referenced by multiple rows becomes a single piece record.
INSERT INTO "pieces" ("id", "user_id", "title", "composer", "part", "created_at", "updated_at")
SELECT
    gen_random_uuid(),
    g."user_id",
    pr."song_title",
    pr."composer",
    pr."part",
    MIN(pr."created_at"),
    MAX(pr."updated_at")
FROM "practice_rows" pr
JOIN "practice_grids" g ON g."id" = pr."practice_grid_id"
WHERE pr."song_title" IS NOT NULL
  AND pr."song_title" != ''
  AND pr."deleted_at" IS NULL
GROUP BY g."user_id", pr."song_title", pr."composer", pr."part";

-- Also migrate pieces for soft-deleted rows (preserve their data too)
INSERT INTO "pieces" ("id", "user_id", "title", "composer", "part", "created_at", "updated_at")
SELECT
    gen_random_uuid(),
    g."user_id",
    pr."song_title",
    pr."composer",
    pr."part",
    MIN(pr."created_at"),
    MAX(pr."updated_at")
FROM "practice_rows" pr
JOIN "practice_grids" g ON g."id" = pr."practice_grid_id"
WHERE pr."song_title" IS NOT NULL
  AND pr."song_title" != ''
  AND pr."deleted_at" IS NOT NULL
  AND NOT EXISTS (
      -- Skip if this (user, title, composer, part) combo was already inserted above
      SELECT 1 FROM "pieces" p
      WHERE p."user_id" = g."user_id"
        AND p."title" = pr."song_title"
        AND p."composer" IS NOT DISTINCT FROM pr."composer"
        AND p."part" IS NOT DISTINCT FROM pr."part"
  )
GROUP BY g."user_id", pr."song_title", pr."composer", pr."part";

-- Step 4: Populate piece_id on practice_rows by matching back to the created pieces
UPDATE "practice_rows" pr
SET "piece_id" = p."id"
FROM "practice_grids" g, "pieces" p
WHERE g."id" = pr."practice_grid_id"
  AND p."user_id" = g."user_id"
  AND p."title" = pr."song_title"
  AND p."composer" IS NOT DISTINCT FROM pr."composer"
  AND p."part" IS NOT DISTINCT FROM pr."part"
  AND pr."song_title" IS NOT NULL
  AND pr."song_title" != '';

-- Step 5: Add foreign key constraint now that data is populated
ALTER TABLE "practice_rows" ADD CONSTRAINT "practice_rows_piece_id_fkey"
    FOREIGN KEY ("piece_id") REFERENCES "pieces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 6: Drop the old columns (data is now safely in pieces table)
ALTER TABLE "practice_rows" DROP COLUMN "song_title",
DROP COLUMN "composer",
DROP COLUMN "part";
