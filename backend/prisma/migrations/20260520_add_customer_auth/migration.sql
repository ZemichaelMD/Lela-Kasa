-- Add username and pinHash to Customer
ALTER TABLE "Customer" ADD COLUMN "username" TEXT;
ALTER TABLE "Customer" ADD COLUMN "pinHash" TEXT;
CREATE UNIQUE INDEX "Customer_username_key" ON "Customer"("username");
CREATE INDEX "Customer_username_idx" ON "Customer"("username");
