import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { ServiceUnavailableException } from '../common/errors/service-unavailable.exception';
import * as path from 'path';
import * as crypto from 'crypto';

import type { StorageAdapter, StoredObject } from './storage/storage-adapter';
import { LocalStorageAdapter } from './storage/local.adapter';
import { S3StorageAdapter } from './storage/s3.adapter';
import { VercelBlobStorageAdapter } from './storage/vercel-blob.adapter';

import { CONTEXT_POLICIES, type UploadContext } from './upload-context';
import { detectMimeFromBuffer } from './magic-bytes';

type DriverName = 'local' | 's3' | 'r2' | 'vercel_blob';

const EXT_FROM_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'image/svg+xml': '.svg',
  'application/pdf': '.pdf',
};

const STORAGE_KEYS = [
  'storage_driver', 's3_bucket', 's3_region', 's3_endpoint',
  's3_access_key', 's3_secret_key', 'vercel_blob_token',
];

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  mimeType: string;
  driver: DriverName;
}

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  private cachedAdapter: StorageAdapter | null = null;
  private cachedDriverName: DriverName | null = null;
  private localAdapter: LocalStorageAdapter | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  private async resolveDriverName(): Promise<DriverName> {
    const settings = await this.prisma.systemSetting.findMany({
      where: { key: { in: STORAGE_KEYS } },
    });
    const map: Record<string, string> = {};
    for (const r of settings) {
      map[r.key] = r.iv && this.crypto.isReady()
        ? this.crypto.decrypt(r.value, r.iv)
        : r.value;
    }

    const fromDb = map['storage_driver'];
    if (fromDb && this.isValidDriver(fromDb)) return fromDb as DriverName;

    return 'local';
  }

  private isValidDriver(value: string): value is DriverName {
    return value === 'local' || value === 's3' || value === 'r2' || value === 'vercel_blob';
  }

  private async buildAdapter(driver: DriverName): Promise<StorageAdapter> {
    if (driver === 'local') {
      const localPath = this.config.get<string>('storage.localPath') ?? './uploads';
      const appUrl = (this.config.get<string>('app.appUrl') ?? 'http://localhost:3001').replace(/\/$/, '');
      this.localAdapter = new LocalStorageAdapter({
        rootPath: localPath,
        publicBaseUrl: `${appUrl}/uploads`,
      });
      return this.localAdapter;
    }

    const settings = await this.prisma.systemSetting.findMany({
      where: { key: { in: STORAGE_KEYS } },
    });
    const map: Record<string, string> = {};
    for (const r of settings) {
      map[r.key] = r.iv && this.crypto.isReady()
        ? this.crypto.decrypt(r.value, r.iv)
        : r.value;
    }
    const get = (key: string) => map[key] || '';

    if (driver === 's3' || driver === 'r2') {
      const bucket = get('s3_bucket');
      const region = get('s3_region') || (driver === 's3' ? 'us-east-1' : 'auto');
      const accessKeyId = get('s3_access_key');
      const secretAccessKey = get('s3_secret_key');
      const endpoint = get('s3_endpoint') || undefined;

      if (!bucket || !accessKeyId || !secretAccessKey) {
        throw new ServiceUnavailableException(
          'FILE_STORAGE_NOT_CONFIGURED',
          `Storage driver '${driver}' is missing required credentials.`,
        );
      }
      return new S3StorageAdapter({
        driver,
        bucket,
        region,
        accessKeyId,
        secretAccessKey,
        endpoint: endpoint || undefined,
      });
    }

    // vercel_blob
    const token = get('vercel_blob_token');
    if (!token) {
      throw new ServiceUnavailableException(
        'FILE_STORAGE_NOT_CONFIGURED',
        'Vercel Blob token is not configured.',
      );
    }
    return new VercelBlobStorageAdapter({ readWriteToken: token });
  }

  private async getAdapter(): Promise<StorageAdapter> {
    const driver = await this.resolveDriverName();
    if (this.cachedAdapter && this.cachedDriverName === driver) {
      return this.cachedAdapter;
    }
    this.cachedAdapter = await this.buildAdapter(driver);
    this.cachedDriverName = driver;
    this.logger.log(`Using storage driver: ${driver}`);
    return this.cachedAdapter;
  }

  invalidateCache(): void {
    this.cachedAdapter = null;
    this.cachedDriverName = null;
  }

  describeActiveDriver(): { driver: DriverName; source: 'env' | 'db' | 'default' } {
    return { driver: this.cachedDriverName ?? 'local', source: 'db' };
  }

  async validateAndStore(
    file: Express.Multer.File,
    context: UploadContext,
    userId?: string,
  ): Promise<UploadResult> {
    if (!file) throw new BadRequestException('No file provided');
    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Empty file');
    }

    const policy = CONTEXT_POLICIES[context];

    if (file.size > policy.maxBytes) {
      throw new BadRequestException(
        `File exceeds ${policy.maxBytes / 1024 / 1024} MB limit for context "${context}"`,
      );
    }

    const detectedMime = detectMimeFromBuffer(file.buffer);
    if (!detectedMime || !policy.allowedMimes.has(detectedMime)) {
      throw new BadRequestException(`File type not allowed in context "${context}"`);
    }

    const ext = EXT_FROM_MIME[detectedMime] ?? path.extname(file.originalname).toLowerCase();
    if (!policy.allowedExtensions.has(ext)) {
      throw new BadRequestException('File extension not allowed');
    }

    const adapter = await this.getAdapter();
    const safeUserPrefix = userId ? userId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16) : 'anon';
    const key = `${new Date().getFullYear()}-${safeUserPrefix}-${crypto.randomUUID()}${ext}`;

    const stored: StoredObject = await adapter.put(file.buffer, key, detectedMime);
    return {
      url: stored.url,
      key: stored.key,
      size: stored.size,
      mimeType: detectedMime,
      driver: adapter.name,
    };
  }

  async uploadImage(file: Express.Multer.File, userId?: string): Promise<UploadResult> {
    return this.validateAndStore(file, 'image', userId);
  }

  async testStorage(): Promise<{ ok: boolean; message: string }> {
    try {
      const adapter = await this.getAdapter();
      const testKey = `_test_${crypto.randomUUID()}.txt`;
      const testBuffer = Buffer.from('Kasa storage test');
      await adapter.put(testBuffer, testKey, 'text/plain');
      if (adapter.remove) {
        await adapter.remove(testKey);
      }
      return { ok: true, message: `Storage connection successful (${adapter.name})` };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : 'Storage test failed' };
    }
  }
}
