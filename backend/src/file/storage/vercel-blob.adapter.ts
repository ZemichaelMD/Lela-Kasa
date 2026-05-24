import type { StorageAdapter, StoredObject } from './storage-adapter';

export interface VercelBlobAdapterOptions {
  readWriteToken: string;
}

/**
 * Vercel Blob driver. `@vercel/blob` is loaded lazily so the backend boots
 * without it; the package is only required when this driver is selected.
 */
export class VercelBlobStorageAdapter implements StorageAdapter {
  readonly name = 'vercel_blob' as const;

  constructor(private readonly options: VercelBlobAdapterOptions) {}

  private async getModule(): Promise<VercelBlobModule> {
    try {
      return (await import('@vercel/blob' as string)) as never;
    } catch {
      throw new Error(
        `Storage driver 'vercel_blob' is selected but '@vercel/blob' is not installed. Run: pnpm add @vercel/blob`,
      );
    }
  }

  async put(buffer: Buffer, key: string, mimeType: string): Promise<StoredObject> {
    const mod = await this.getModule();
    const result = await mod.put(key, buffer, {
      access: 'public',
      contentType: mimeType,
      token: this.options.readWriteToken,
      addRandomSuffix: false,
    });
    return {
      url: result.url,
      key: result.pathname ?? key,
      size: buffer.byteLength,
      mimeType,
    };
  }

  async remove(key: string): Promise<void> {
    const mod = await this.getModule();
    await mod.del(key, { token: this.options.readWriteToken });
  }
}

interface VercelBlobPutOptions {
  access: 'public';
  contentType?: string;
  token?: string;
  addRandomSuffix?: boolean;
}

interface VercelBlobPutResult {
  url: string;
  pathname?: string;
}

interface VercelBlobModule {
  put(key: string, body: Buffer, options: VercelBlobPutOptions): Promise<VercelBlobPutResult>;
  del(key: string, options: { token?: string }): Promise<void>;
}
