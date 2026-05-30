-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "ProcessedMutation" (
    "id" TEXT NOT NULL,
    "clientMutationId" TEXT NOT NULL,
    "serverId" TEXT,
    "entityType" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedMutation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedMutation_clientMutationId_key" ON "ProcessedMutation"("clientMutationId");

-- CreateIndex
CREATE INDEX "ProcessedMutation_shopId_clientMutationId_idx" ON "ProcessedMutation"("shopId", "clientMutationId");
