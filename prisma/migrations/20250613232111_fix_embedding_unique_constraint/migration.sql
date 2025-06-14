/*
  Warnings:

  - A unique constraint covering the columns `[fileId,chunkIndex,userId]` on the table `document_embeddings` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "document_embeddings_fileId_chunkIndex_key";

-- CreateIndex
CREATE UNIQUE INDEX "document_embeddings_fileId_chunkIndex_userId_key" ON "document_embeddings"("fileId", "chunkIndex", "userId");
