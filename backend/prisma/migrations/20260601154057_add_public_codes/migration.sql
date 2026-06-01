-- Add nullable code columns first so we can backfill existing rows.
ALTER TABLE "Beverage" ADD COLUMN "code" TEXT;
ALTER TABLE "Customer" ADD COLUMN "code" TEXT;

-- Backfill beverage codes per shop, ordered by creation time.
-- Use a window function over a CTE partitioned by shopId. The BE- prefix
-- matches the public ID format generated in app code.
WITH ranked AS (
  SELECT
    "id",
    "shopId",
    ROW_NUMBER() OVER (PARTITION BY "shopId" ORDER BY "createdAt" ASC, "id" ASC) AS rn
  FROM "Beverage"
  WHERE "deletedAt" IS NULL
)
UPDATE "Beverage" b
SET "code" = 'BE-' || LPAD(ranked.rn::text, 3, '0')
FROM ranked
WHERE b."id" = ranked."id"
  AND b."code" IS NULL;

-- Backfill customer codes per shop, ordered by creation time.
WITH ranked AS (
  SELECT
    "id",
    "shopId",
    ROW_NUMBER() OVER (PARTITION BY "shopId" ORDER BY "createdAt" ASC, "id" ASC) AS rn
  FROM "Customer"
  WHERE "deletedAt" IS NULL
)
UPDATE "Customer" c
SET "code" = 'CU-' || LPAD(ranked.rn::text, 3, '0')
FROM ranked
WHERE c."id" = ranked."id"
  AND c."code" IS NULL;

-- Handle any soft-deleted rows that somehow slipped through (shouldn't
-- happen, but be defensive). Use a high sequence number to avoid clashing
-- with active codes.
UPDATE "Beverage"
SET "code" = 'BE-DEL-' || SUBSTRING("id", 1, 8)
WHERE "code" IS NULL;

UPDATE "Customer"
SET "code" = 'CU-DEL-' || SUBSTRING("id", 1, 8)
WHERE "code" IS NULL;

-- Enforce NOT NULL now that every row has a value.
ALTER TABLE "Beverage" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "Customer" ALTER COLUMN "code" SET NOT NULL;

-- Enforce uniqueness per shop.
CREATE UNIQUE INDEX "Beverage_shopId_code_key" ON "Beverage"("shopId", "code");
CREATE UNIQUE INDEX "Customer_shopId_code_key" ON "Customer"("shopId", "code");
