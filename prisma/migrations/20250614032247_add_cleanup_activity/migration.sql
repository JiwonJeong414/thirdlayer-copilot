-- CreateTable
CREATE TABLE "cleanup_activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filesDeleted" INTEGER NOT NULL,
    "filesRequested" INTEGER NOT NULL,
    "errors" INTEGER NOT NULL,
    "deletedFileNames" TEXT[],
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cleanup_activities_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "cleanup_activities" ADD CONSTRAINT "cleanup_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
