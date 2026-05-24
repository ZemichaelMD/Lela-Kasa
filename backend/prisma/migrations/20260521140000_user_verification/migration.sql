-- CreateEnum
CREATE TYPE "VerificationChannel" AS ENUM ('PHONE', 'EMAIL', 'TELEGRAM', 'WHATSAPP');

-- CreateTable
CREATE TABLE "UserVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "VerificationChannel" NOT NULL,
    "identifier" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserVerification_userId_idx" ON "UserVerification"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserVerification_userId_channel_key" ON "UserVerification"("userId", "channel");

-- AddForeignKey
ALTER TABLE "UserVerification" ADD CONSTRAINT "UserVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: existing verified emails become EMAIL verification records.
INSERT INTO "UserVerification" ("id", "userId", "channel", "identifier", "verifiedAt", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", 'EMAIL', "email", now(), now(), now()
FROM "User"
WHERE "emailVerified" = true AND "email" IS NOT NULL AND "email" <> '';

-- Backfill: existing linked Telegram chats become TELEGRAM verification records.
INSERT INTO "UserVerification" ("id", "userId", "channel", "identifier", "verifiedAt", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", 'TELEGRAM', "telegramChatId", now(), now(), now()
FROM "User"
WHERE "telegramChatId" IS NOT NULL AND "telegramChatId" <> '';
