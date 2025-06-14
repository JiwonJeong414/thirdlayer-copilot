-- AlterTable
ALTER TABLE "document_embeddings" ADD COLUMN     "cluster_confidence" DOUBLE PRECISION,
ADD COLUMN     "cluster_id" VARCHAR(100),
ADD COLUMN     "last_clustered_at" TIMESTAMP(3),
ADD COLUMN     "organization_tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "organization_activity" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cluster_name" VARCHAR(255) NOT NULL,
    "folder_name" VARCHAR(255) NOT NULL,
    "files_moved" INTEGER NOT NULL DEFAULT 0,
    "method" VARCHAR(50) NOT NULL,
    "confidence" DOUBLE PRECISION,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_tags" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "file_id" VARCHAR(255) NOT NULL,
    "file_name" VARCHAR(500) NOT NULL,
    "tag" VARCHAR(100) NOT NULL,
    "tag_type" VARCHAR(50) NOT NULL,
    "confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clustering_cache" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "method" VARCHAR(50) NOT NULL,
    "parameters" JSONB NOT NULL,
    "file_ids_hash" VARCHAR(64) NOT NULL,
    "clusters" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clustering_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "preferred_method" VARCHAR(50) NOT NULL DEFAULT 'hybrid',
    "max_clusters" INTEGER NOT NULL DEFAULT 6,
    "min_cluster_size" INTEGER NOT NULL DEFAULT 3,
    "auto_create_folders" BOOLEAN NOT NULL DEFAULT false,
    "auto_tag_files" BOOLEAN NOT NULL DEFAULT true,
    "preferences" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_organization_status" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "file_id" VARCHAR(255) NOT NULL,
    "file_name" VARCHAR(500) NOT NULL,
    "original_folder" VARCHAR(500),
    "organized_folder" VARCHAR(500),
    "cluster_id" VARCHAR(100),
    "organization_method" VARCHAR(50),
    "organized_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confidence" DOUBLE PRECISION,

    CONSTRAINT "file_organization_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organization_activity_user_id_timestamp_idx" ON "organization_activity"("user_id", "timestamp");

-- CreateIndex
CREATE INDEX "organization_activity_method_idx" ON "organization_activity"("method");

-- CreateIndex
CREATE INDEX "organization_activity_timestamp_idx" ON "organization_activity"("timestamp");

-- CreateIndex
CREATE INDEX "file_tags_user_id_tag_idx" ON "file_tags"("user_id", "tag");

-- CreateIndex
CREATE INDEX "file_tags_file_id_idx" ON "file_tags"("file_id");

-- CreateIndex
CREATE INDEX "file_tags_tag_type_idx" ON "file_tags"("tag_type");

-- CreateIndex
CREATE UNIQUE INDEX "file_tags_user_id_file_id_tag_key" ON "file_tags"("user_id", "file_id", "tag");

-- CreateIndex
CREATE INDEX "clustering_cache_user_id_method_idx" ON "clustering_cache"("user_id", "method");

-- CreateIndex
CREATE INDEX "clustering_cache_file_ids_hash_idx" ON "clustering_cache"("file_ids_hash");

-- CreateIndex
CREATE INDEX "clustering_cache_expires_at_idx" ON "clustering_cache"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "organization_preferences_user_id_key" ON "organization_preferences"("user_id");

-- CreateIndex
CREATE INDEX "file_organization_status_user_id_file_id_idx" ON "file_organization_status"("user_id", "file_id");

-- CreateIndex
CREATE INDEX "file_organization_status_cluster_id_idx" ON "file_organization_status"("cluster_id");

-- CreateIndex
CREATE INDEX "file_organization_status_organized_at_idx" ON "file_organization_status"("organized_at");

-- CreateIndex
CREATE UNIQUE INDEX "file_organization_status_user_id_file_id_key" ON "file_organization_status"("user_id", "file_id");

-- CreateIndex
CREATE INDEX "idx_embeddings_cluster" ON "document_embeddings"("cluster_id");

-- CreateIndex
CREATE INDEX "idx_embeddings_user_cluster" ON "document_embeddings"("userId", "cluster_id");

-- AddForeignKey
ALTER TABLE "organization_activity" ADD CONSTRAINT "organization_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_tags" ADD CONSTRAINT "file_tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clustering_cache" ADD CONSTRAINT "clustering_cache_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_preferences" ADD CONSTRAINT "organization_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_organization_status" ADD CONSTRAINT "file_organization_status_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
