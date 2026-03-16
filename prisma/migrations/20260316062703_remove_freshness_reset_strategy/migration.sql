/*
  Warnings:

  - You are about to drop the column `freshness_reset_strategy` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "pieces" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "freshness_reset_strategy";

-- DropEnum
DROP TYPE "FreshnessResetStrategy";
