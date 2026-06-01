import type { Prisma, PrismaClient } from '../database';
import { AppException } from './errors/app.exception';
import { ErrorCode } from '../contract';

const PREFIX_PATTERN = /^[A-Z][A-Z0-9]{0,7}$/;
const CODE_PATTERN = /^[A-Z][A-Z0-9]{0,7}-\d{1,9}$/;
const NUMBER_TAIL_PATTERN = /-(\d+)$/;

type CodeLookupModel = 'beverage' | 'customer';

type PublicCodeClient = PrismaClient | Prisma.TransactionClient;

export function normalizePublicCode(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().toUpperCase();
  if (!trimmed) return undefined;
  if (!CODE_PATTERN.test(trimmed)) return undefined;
  return trimmed;
}

export function isValidCodeShape(value: string): boolean {
  return CODE_PATTERN.test(value);
}

function ensureValidPrefix(prefix: string): void {
  if (!PREFIX_PATTERN.test(prefix)) {
    throw new AppException({
      code: ErrorCode.VALIDATION_ERROR,
      message: `Invalid public code prefix: ${prefix}`,
      status: 422,
    });
  }
}

interface CodeCountableDelegate {
  findFirst(args: unknown): Promise<{ code: string } | null>;
}

interface CodeLookupDelegate {
  findFirst(args: unknown): Promise<{ id: string } | null>;
}

function countable(
  client: PublicCodeClient,
  model: CodeLookupModel,
): CodeCountableDelegate {
  return client[model] as unknown as CodeCountableDelegate;
}

function lookup(
  client: PublicCodeClient,
  model: CodeLookupModel,
): CodeLookupDelegate {
  return client[model] as unknown as CodeLookupDelegate;
}

export interface NextCodeOptions {
  prefix: string;
  padLength: number;
  prisma: PublicCodeClient;
  model: CodeLookupModel;
  shopId: string;
}

export async function generateNextCode({
  prefix,
  padLength,
  prisma,
  model,
  shopId,
}: NextCodeOptions): Promise<string> {
  ensureValidPrefix(prefix);
  const table = countable(prisma, model);

  // Find the highest existing numeric suffix for this shop/prefix.
  // The unique index (shopId, code) provides collision safety; we still
  // retry a handful of times in the unlikely event of a race.
  const result = await table.findFirst({
    where: {
      shopId,
      code: { startsWith: `${prefix}-` },
    },
    orderBy: { code: 'desc' },
    select: { code: true },
  });

  let next = 1;
  if (result) {
    const match = result.code.match(NUMBER_TAIL_PATTERN);
    if (match) {
      const current = Number.parseInt(match[1], 10);
      if (Number.isFinite(current) && current >= 1) {
        next = current + 1;
      }
    }
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `${prefix}-${String(next).padStart(padLength, '0')}`;
    const existing = await lookup(prisma, model).findFirst({
      where: { shopId, code: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    next += 1;
  }

  throw new AppException({
    code: ErrorCode.INTERNAL_SERVER_ERROR,
    message: `Failed to allocate public code with prefix ${prefix}`,
    status: 500,
  });
}

export async function findEntityIdByCode(
  prisma: PublicCodeClient,
  model: CodeLookupModel,
  shopId: string,
  rawCode: string,
): Promise<string | null> {
  const code = normalizePublicCode(rawCode);
  if (!code) return null;
  const row = await lookup(prisma, model).findFirst({
    where: { shopId, code, deletedAt: null },
    select: { id: true },
  });
  return row?.id ?? null;
}

export type { CodeLookupModel };
