import { promises as fs } from 'fs';
import * as path from 'path';

import type { StorageAdapter, StoredObject } from './storage-adapter';

export interface LocalAdapterOptions {
  /** Filesystem directory files are written to. */
  rootPath: string;
  /** Absolute URL prefix the served files are reachable on (no trailing slash). */
  publicBaseUrl: string;
}

/** Disk-based driver — writes under `rootPath`, served back via the media controller. */
export class LocalStorageAdapter implements StorageAdapter {
  readonly name = 'local' as const;
  private readonly rootPath: string;
  private readonly publicBaseUrl: string;
  private ensured = false;

  constructor(options: LocalAdapterOptions) {
    this.rootPath = path.resolve(options.rootPath);
    this.publicBaseUrl = options.publicBaseUrl.replace(/\/$/, '');
  }

  private async ensureRoot(): Promise<void> {
    if (this.ensured) return;
    await fs.mkdir(this.rootPath, { recursive: true });
    this.ensured = true;
  }

  async put(buffer: Buffer, key: string, mimeType: string): Promise<StoredObject> {
    await this.ensureRoot();
    const target = path.join(this.rootPath, key);
    await fs.writeFile(target, buffer);
    return {
      url: `${this.publicBaseUrl}/${encodeURIComponent(key)}`,
      key,
      size: buffer.byteLength,
      mimeType,
    };
  }

  async remove(key: string): Promise<void> {
    const target = path.join(this.rootPath, key);
    // path traversal guard — must stay under root
    if (!target.startsWith(this.rootPath)) return;
    await fs.rm(target, { force: true });
  }
}
