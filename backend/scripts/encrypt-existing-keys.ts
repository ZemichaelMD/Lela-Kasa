import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;

const SENSITIVE_KEYS = new Set([
  'resend_api_key',
  'smtp_password',
  'sms_api_key',
  'smsethiopia_api_key',
  'twilio_auth_token',
  'chapa_secret_key',
  'chapa_webhook_secret',
  'whatsapp_meta_access_token',
  'whatsapp_twilio_token',
  'telegram_bot_token',
  'ai_api_key',
  's3_secret_key',
  'vercel_blob_token',
]);

function encrypt(plaintext: string, key: Buffer): { ciphertext: string; iv: string } {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([encrypted, tag]);
  return {
    ciphertext: combined.toString('base64'),
    iv: iv.toString('base64'),
  };
}

async function main() {
  const keysSecret = process.env.KEYS_SECRET;
  if (!keysSecret) {
    console.error('KEYS_SECRET env var is required');
    process.exit(1);
  }
  const key = Buffer.from(keysSecret, 'hex');
  if (key.length !== 32) {
    console.error('KEYS_SECRET must be a 64-character hex string (32 bytes)');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const rows = await prisma.systemSetting.findMany();
  let encrypted = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!SENSITIVE_KEYS.has(row.key)) continue;
    if (row.iv) { skipped++; continue; }
    if (!row.value) continue;

    const { ciphertext, iv } = encrypt(row.value, key);
    await prisma.systemSetting.update({
      where: { id: row.id },
      data: { value: ciphertext, iv },
    });
    encrypted++;
    console.log(`Encrypted: ${row.key}`);
  }

  console.log(`\nDone. ${encrypted} keys encrypted, ${skipped} already encrypted.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
