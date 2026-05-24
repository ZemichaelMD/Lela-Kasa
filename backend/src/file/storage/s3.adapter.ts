import type { StorageAdapter, StoredObject } from './storage-adapter';

export interface S3AdapterOptions {
  /** Driver tag — used for logging / introspection only. */
  driver?: 's3' | 'r2';
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Custom endpoint (R2, MinIO, etc.); omit for AWS. */
  endpoint?: string;
  /** Optional CDN/public host override; falls back to virtual-hosted URL. */
  publicBaseUrl?: string;
}

/**
 * S3-compatible driver. `@aws-sdk/client-s3` is loaded lazily so the backend
 * boots fine without it — the package is only required when this driver is
 * selected.
 */
export class S3StorageAdapter implements StorageAdapter {
  readonly name: 's3' | 'r2';
  private client: unknown;
  private PutObjectCommand!: new (input: Record<string, unknown>) => unknown;
  private DeleteObjectCommand!: new (input: Record<string, unknown>) => unknown;

  constructor(private readonly options: S3AdapterOptions) {
    this.name = options.driver ?? 's3';
  }

  private async getClient(): Promise<unknown> {
    if (this.client) return this.client;
    let mod: {
      S3Client: new (input: Record<string, unknown>) => { send: (cmd: unknown) => Promise<unknown> };
      PutObjectCommand: new (input: Record<string, unknown>) => unknown;
      DeleteObjectCommand: new (input: Record<string, unknown>) => unknown;
    };
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      mod = (await import('@aws-sdk/client-s3' as string)) as never;
    } catch {
      throw new Error(
        `Storage driver '${this.name}' is selected but '@aws-sdk/client-s3' is not installed. Run: pnpm add @aws-sdk/client-s3`,
      );
    }
    const { S3Client, PutObjectCommand, DeleteObjectCommand } = mod;
    this.PutObjectCommand = PutObjectCommand as never;
    this.DeleteObjectCommand = DeleteObjectCommand as never;
    this.client = new S3Client({
      region: this.options.region,
      endpoint: this.options.endpoint,
      forcePathStyle: !!this.options.endpoint,
      credentials: {
        accessKeyId: this.options.accessKeyId,
        secretAccessKey: this.options.secretAccessKey,
      },
    });
    return this.client;
  }

  async put(buffer: Buffer, key: string, mimeType: string): Promise<StoredObject> {
    const client = (await this.getClient()) as { send: (cmd: unknown) => Promise<unknown> };
    await client.send(
      new this.PutObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
    return {
      url: this.publicUrl(key),
      key,
      size: buffer.byteLength,
      mimeType,
    };
  }

  async remove(key: string): Promise<void> {
    const client = (await this.getClient()) as { send: (cmd: unknown) => Promise<unknown> };
    await client.send(
      new this.DeleteObjectCommand({ Bucket: this.options.bucket, Key: key }),
    );
  }

  private publicUrl(key: string): string {
    if (this.options.publicBaseUrl) {
      return `${this.options.publicBaseUrl.replace(/\/$/, '')}/${encodeURIComponent(key)}`;
    }
    if (this.options.endpoint) {
      return `${this.options.endpoint.replace(/\/$/, '')}/${this.options.bucket}/${encodeURIComponent(key)}`;
    }
    return `https://${this.options.bucket}.s3.${this.options.region}.amazonaws.com/${encodeURIComponent(key)}`;
  }
}
