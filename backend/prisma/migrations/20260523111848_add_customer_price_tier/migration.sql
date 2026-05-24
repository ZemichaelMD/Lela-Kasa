-- DropIndex
DROP INDEX "User_username_idx";

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "priceTierId" TEXT,
ADD COLUMN     "priceTierLocked" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_priceTierId_fkey" FOREIGN KEY ("priceTierId") REFERENCES "PriceTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
