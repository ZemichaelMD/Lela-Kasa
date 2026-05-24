const SIGNATURES: Array<{ mime: string; bytes: number[]; offset: number }> = [
  { mime: 'image/jpeg',       bytes: [0xff, 0xd8, 0xff], offset: 0 },
  { mime: 'image/png',        bytes: [0x89, 0x50, 0x4e, 0x47], offset: 0 },
  { mime: 'image/webp',       bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 },
  { mime: 'image/gif',        bytes: [0x47, 0x49, 0x46, 0x38], offset: 0 },
  { mime: 'image/avif',       bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 },
  { mime: 'application/pdf',  bytes: [0x25, 0x50, 0x44, 0x46], offset: 0 },
];

export function detectMimeFromBuffer(buf: Buffer): string | null {
  for (const sig of SIGNATURES) {
    if (buf.length < sig.offset + sig.bytes.length) continue;
    const slice = buf.subarray(sig.offset, sig.offset + sig.bytes.length);
    if (sig.bytes.every((b, i) => slice[i] === b)) return sig.mime;
  }
  return null;
}
