-- CreateTable
CREATE TABLE "SaleContainerKasa" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "beverageId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleContainerKasa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SaleContainerKasa_saleId_idx" ON "SaleContainerKasa"("saleId");

-- AddForeignKey
ALTER TABLE "SaleContainerKasa" ADD CONSTRAINT "SaleContainerKasa_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleContainerKasa" ADD CONSTRAINT "SaleContainerKasa_beverageId_fkey" FOREIGN KEY ("beverageId") REFERENCES "Beverage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
