-- Data-preserving migration: normalize song data from practice_rows into pieces table
--
-- Strategy:
--   1. Create the pieces table
--   2. Add piece_id column to practice_rows (nullable, no FK yet)
--   3. Insert deduplicated pieces from existing practice_rows data
--      - Deduplication key: (user_id, title, composer, part) with IS NOT DISTINCT FROM for NULLs
--      - user_id is resolved via JOIN through practice_grids
--      - Rows with non-empty song_title → piece with that title
--      - Rows with blank song_title but populated composer/part → piece titled "[Untitled]"
--      - Rows with no song data at all → piece_id stays NULL
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

-- Step 3a: Insert deduplicated pieces from active rows with a non-empty song_title.
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

-- Step 3b: Insert pieces for soft-deleted rows (preserve their data too).
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
      SELECT 1 FROM "pieces" p
      WHERE p."user_id" = g."user_id"
        AND p."title" = pr."song_title"
        AND p."composer" IS NOT DISTINCT FROM pr."composer"
        AND p."part" IS NOT DISTINCT FROM pr."part"
  )
GROUP BY g."user_id", pr."song_title", pr."composer", pr."part";

-- Step 3c: Handle orphan metadata — rows with blank/null song_title but
-- populated composer or part. The legacy schema had no constraint preventing this.
-- We create a piece with title "[Untitled]" to preserve the composer/part data.
INSERT INTO "pieces" ("id", "user_id", "title", "composer", "part", "created_at", "updated_at")
SELECT
    gen_random_uuid(),
    g."user_id",
    '[Untitled]',
    pr."composer",
    pr."part",
    MIN(pr."created_at"),
    MAX(pr."updated_at")
FROM "practice_rows" pr
JOIN "practice_grids" g ON g."id" = pr."practice_grid_id"
WHERE (pr."song_title" IS NULL OR pr."song_title" = '')
  AND (pr."composer" IS NOT NULL OR pr."part" IS NOT NULL)
  AND NOT EXISTS (
      SELECT 1 FROM "pieces" p
      WHERE p."user_id" = g."user_id"
        AND p."title" = '[Untitled]'
        AND p."composer" IS NOT DISTINCT FROM pr."composer"
        AND p."part" IS NOT DISTINCT FROM pr."part"
  )
GROUP BY g."user_id", pr."composer", pr."part";

-- Step 4a: Populate piece_id for rows with a song_title
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

-- Step 4b: Populate piece_id for orphan-metadata rows
UPDATE "practice_rows" pr
SET "piece_id" = p."id"
FROM "practice_grids" g, "pieces" p
WHERE g."id" = pr."practice_grid_id"
  AND p."user_id" = g."user_id"
  AND p."title" = '[Untitled]'
  AND p."composer" IS NOT DISTINCT FROM pr."composer"
  AND p."part" IS NOT DISTINCT FROM pr."part"
  AND (pr."song_title" IS NULL OR pr."song_title" = '')
  AND (pr."composer" IS NOT NULL OR pr."part" IS NOT NULL);

-- Step 5: Add foreign key constraint now that data is populated
ALTER TABLE "practice_rows" ADD CONSTRAINT "practice_rows_piece_id_fkey"
    FOREIGN KEY ("piece_id") REFERENCES "pieces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 6: Drop the old columns (data is now safely in pieces table)
ALTER TABLE "practice_rows" DROP COLUMN "song_title",
DROP COLUMN "composer",
DROP COLUMN "part";
