/**
 * Storage adapter contract — backend stays agnostic of where files actually
 * live. Concrete adapters wrap local disk, S3-compatible buckets, and Vercel
 * Blob; new ones can be added without touching the controller/service.
 */
export interface StoredObject {
  /** Absolute, browser-fetchable URL. */
  url: string;
  /** Stable opaque key used for deletion. */
  key: string;
  /** Bytes written. */
  size: number;
  /** Detected MIME type. */
  mimeType: string;
}

export interface StorageAdapter {
  readonly name: 'local' | 's3' | 'r2' | 'vercel_blob';
  put(buffer: Buffer, key: string, mimeType: string): Promise<StoredObject>;
  remove(key: string): Promise<void>;
}
