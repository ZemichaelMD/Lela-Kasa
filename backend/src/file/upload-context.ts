export type UploadContext = 'image' | 'document' | 'payment-proof';

export interface ContextPolicy {
  allowedMimes: Set<string>;
  maxBytes: number;
  allowedExtensions: Set<string>;
}

export const CONTEXT_POLICIES: Record<UploadContext, ContextPolicy> = {
  image: {
    allowedMimes: new Set([
      'image/jpeg', 'image/png', 'image/webp',
      'image/gif', 'image/avif', 'image/svg+xml',
    ]),
    maxBytes: 8 * 1024 * 1024,
    allowedExtensions: new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg']),
  },
  document: {
    allowedMimes: new Set([
      'image/jpeg', 'image/png', 'image/webp',
      'application/pdf',
    ]),
    maxBytes: 20 * 1024 * 1024,
    allowedExtensions: new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']),
  },
  'payment-proof': {
    allowedMimes: new Set([
      'image/jpeg', 'image/png', 'image/webp',
      'application/pdf',
    ]),
    maxBytes: 10 * 1024 * 1024,
    allowedExtensions: new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']),
  },
};
