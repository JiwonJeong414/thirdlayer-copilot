/*
  Warnings:

  - You are about to drop the column `cluster_confidence` on the `document_embeddings` table. All the data in the column will be lost.
  - You are about to drop the column `cluster_id` on the `document_embeddings` table. All the data in the column will be lost.
  - You are about to drop the column `last_clustered_at` on the `document_embeddings` table. All the data in the column will be lost.
  - You are about to drop the column `organization_tags` on the `document_embeddings` table. All the data in the column will be lost.
  - You are about to drop the `clustering_cache` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `file_organization_status` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `file_tags` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `organization_activity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `organization_preferences` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "clustering_cache" DROP CONSTRAINT "clustering_cache_user_id_fkey";

-- DropForeignKey
ALTER TABLE "file_organization_status" DROP CONSTRAINT "file_organization_status_user_id_fkey";

-- DropForeignKey
ALTER TABLE "file_tags" DROP CONSTRAINT "file_tags_user_id_fkey";

-- DropForeignKey
ALTER TABLE "organization_activity" DROP CONSTRAINT "organization_activity_user_id_fkey";

-- DropForeignKey
ALTER TABLE "organization_preferences" DROP CONSTRAINT "organization_preferences_user_id_fkey";

-- DropIndex
DROP INDEX "idx_embeddings_cluster";

-- DropIndex
DROP INDEX "idx_embeddings_user_cluster";

-- AlterTable
ALTER TABLE "document_embeddings" DROP COLUMN "cluster_confidence",
DROP COLUMN "cluster_id",
DROP COLUMN "last_clustered_at",
DROP COLUMN "organization_tags";

-- DropTable
DROP TABLE "clustering_cache";

-- DropTable
DROP TABLE "file_organization_status";

-- DropTable
DROP TABLE "file_tags";

-- DropTable
DROP TABLE "organization_activity";

-- DropTable
DROP TABLE "organization_preferences";
