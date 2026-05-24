/**
 * Environment variable parsing — a thin wrapper over Zod for apps that
 * want fail-fast env validation without NestJS ConfigModule.
 */

import { z } from 'zod';

export function parseEnv<T extends z.ZodRawShape>(
  schema: T,
  env: Record<string, string | undefined> = (globalThis as {
    process?: { env: Record<string, string | undefined> };
  }).process?.env ?? {},
): z.infer<z.ZodObject<T>> {
  const result = z.object(schema).safeParse(env);
  if (!result.success) {
    const formatted = result.error.errors
      .map((e) => `  ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`Environment variable validation failed:\n${formatted}`);
  }
  return result.data;
}

export { z };
