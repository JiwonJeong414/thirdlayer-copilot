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

-- CreateIndex
CREATE INDEX "organization_activity_user_id_timestamp_idx" ON "organization_activity"("user_id", "timestamp");

-- CreateIndex
CREATE INDEX "organization_activity_method_idx" ON "organization_activity"("method");

-- CreateIndex
CREATE INDEX "organization_activity_timestamp_idx" ON "organization_activity"("timestamp");

-- AddForeignKey
ALTER TABLE "organization_activity" ADD CONSTRAINT "organization_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
