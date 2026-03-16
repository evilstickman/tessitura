/*
  Warnings:

  - You are about to drop the column `composer` on the `practice_rows` table. All the data in the column will be lost.
  - You are about to drop the column `part` on the `practice_rows` table. All the data in the column will be lost.
  - You are about to drop the column `song_title` on the `practice_rows` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "practice_rows" DROP COLUMN "composer",
DROP COLUMN "part",
DROP COLUMN "song_title",
ADD COLUMN     "piece_id" UUID;

-- CreateTable
CREATE TABLE "pieces" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "composer" TEXT,
    "part" TEXT,
    "study_reference" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "pieces_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "pieces" ADD CONSTRAINT "pieces_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_rows" ADD CONSTRAINT "practice_rows_piece_id_fkey" FOREIGN KEY ("piece_id") REFERENCES "pieces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
