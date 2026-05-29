-- Fix schema drift: tables/columns exist in DB but migration history was missing.
-- Uses idempotent DDL so `prisma migrate dev` or `resolve --applied` both work.

-- CreateTable: CustomerEmailVerificationToken
CREATE TABLE IF NOT EXISTS "CustomerEmailVerificationToken" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerEmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CustomerPinResetToken
CREATE TABLE IF NOT EXISTS "CustomerPinResetToken" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerPinResetToken_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Customer
DO $$ BEGIN
  ALTER TABLE "Customer" ADD COLUMN "email" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Customer" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- AlterTable: Sale
DO $$ BEGIN
  ALTER TABLE "Sale" ADD COLUMN "updatedById" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- CreateIndexes
CREATE INDEX IF NOT EXISTS "CustomerEmailVerificationToken_customerId_idx" ON "CustomerEmailVerificationToken"("customerId");
CREATE INDEX IF NOT EXISTS "CustomerPinResetToken_customerId_idx" ON "CustomerPinResetToken"("customerId");
CREATE INDEX IF NOT EXISTS "Customer_email_idx" ON "Customer"("email");

-- Unique constraints (need constraint-level check)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomerEmailVerificationToken_codeHash_key') THEN
    ALTER TABLE "CustomerEmailVerificationToken" ADD CONSTRAINT "CustomerEmailVerificationToken_codeHash_key" UNIQUE ("codeHash");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomerPinResetToken_codeHash_key') THEN
    ALTER TABLE "CustomerPinResetToken" ADD CONSTRAINT "CustomerPinResetToken_codeHash_key" UNIQUE ("codeHash");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Customer_email_key') THEN
    ALTER TABLE "Customer" ADD CONSTRAINT "Customer_email_key" UNIQUE ("email");
  END IF;
END $$;

-- Foreign keys
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomerEmailVerificationToken_customerId_fkey') THEN
    ALTER TABLE "CustomerEmailVerificationToken" ADD CONSTRAINT "CustomerEmailVerificationToken_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomerPinResetToken_customerId_fkey') THEN
    ALTER TABLE "CustomerPinResetToken" ADD CONSTRAINT "CustomerPinResetToken_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Sale_updatedById_fkey') THEN
    ALTER TABLE "Sale" ADD CONSTRAINT "Sale_updatedById_fkey"
      FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Safe data backfill: existing sales get updatedById = createdById
UPDATE "Sale" SET "updatedById" = "createdById" WHERE "updatedById" IS NULL;
