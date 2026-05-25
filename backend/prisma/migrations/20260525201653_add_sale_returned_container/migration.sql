-- CreateTable
CREATE TABLE "SaleReturnedContainer" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "beverageId" TEXT NOT NULL,
    "boxes" INTEGER NOT NULL DEFAULT 0,
    "bottles" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleReturnedContainer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SaleReturnedContainer_saleId_idx" ON "SaleReturnedContainer"("saleId");

-- AddForeignKey
ALTER TABLE "SaleReturnedContainer" ADD CONSTRAINT "SaleReturnedContainer_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleReturnedContainer" ADD CONSTRAINT "SaleReturnedContainer_beverageId_fkey" FOREIGN KEY ("beverageId") REFERENCES "Beverage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
