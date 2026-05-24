import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;

@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly key: Buffer | null;

  constructor(private readonly config: ConfigService) {
    const hex = this.config.get<string>('KEYS_SECRET');
    if (!hex) {
      this.logger.warn('KEYS_SECRET is not set — sensitive settings will not be encrypted/decrypted');
      this.key = null;
    } else {
      this.key = Buffer.from(hex, 'hex');
    }
  }

  isReady(): boolean {
    return this.key !== null;
  }

  encrypt(plaintext: string): { ciphertext: string; iv: string } {
    if (!this.key) throw new Error('CryptoService: KEYS_SECRET not configured');
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const combined = Buffer.concat([encrypted, tag]);
    return {
      ciphertext: combined.toString('base64'),
      iv: iv.toString('base64'),
    };
  }

  decrypt(ciphertext: string, iv: string): string {
    if (!this.key) {
      this.logger.warn('CryptoService: cannot decrypt — KEYS_SECRET not set');
      return '';
    }
    const combined = Buffer.from(ciphertext, 'base64');
    const ivBuf = Buffer.from(iv, 'base64');
    const tag = combined.subarray(combined.length - TAG_BYTES);
    const encrypted = combined.subarray(0, combined.length - TAG_BYTES);
    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, ivBuf);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final('utf8');
  }
}
