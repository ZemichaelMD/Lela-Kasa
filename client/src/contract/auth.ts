import { z } from 'zod';

import { UserRole } from './enums';

/**
 * Strong-password rule used in both register and reset/change flows. Mirrors
 * the server-side `assertStrongPassword` check: min 8 chars + 3 of 4 character
 * classes (lower / upper / digit / symbol).
 */
export const StrongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .refine((p) => {
    const classes = [
      /[a-z]/.test(p),
      /[A-Z]/.test(p),
      /[0-9]/.test(p),
      /[^A-Za-z0-9]/.test(p),
    ].filter(Boolean).length;
    return classes >= 3;
  }, 'Use at least 3 of: lowercase, uppercase, numbers, symbols');

export const RegisterInputSchema = z.object({
  email: z.string().email(),
  password: StrongPasswordSchema,
  name: z.string().trim().min(1).max(120),
  shopName: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(32).optional(),
});

export const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const RefreshInputSchema = z.object({
  refreshToken: z.string().min(1),
});

export const ForgotPasswordInputSchema = z.object({
  email: z.string().email(),
});

export const ResetPasswordInputSchema = z.object({
  token: z.string().min(1),
  password: StrongPasswordSchema,
});

export const VerifyEmailInputSchema = z.object({
  token: z.string().min(1),
});

export const ChangePasswordInputSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: StrongPasswordSchema,
});

export const SessionSchema = z.object({
  id: z.string(),
  userAgent: z.string().nullable(),
  ipAddress: z.string().nullable(),
  createdAt: z.string().or(z.date()),
  lastUsedAt: z.string().or(z.date()).nullable(),
  expiresAt: z.string().or(z.date()),
  current: z.boolean(),
});

export const SessionListSchema = z.array(SessionSchema);

export const AuthUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().nullable(),
  role: z.nativeEnum(UserRole).or(z.string().min(1)),
  emailVerified: z.boolean(),
});

export const AuthTokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

export const LoginResponseSchema = AuthTokensSchema.extend({
  user: AuthUserSchema,
});

export type RegisterInput = z.infer<typeof RegisterInputSchema>;
export type LoginInput = z.infer<typeof LoginInputSchema>;
export type RefreshInput = z.infer<typeof RefreshInputSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordInputSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordInputSchema>;
export type VerifyEmailInput = z.infer<typeof VerifyEmailInputSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordInputSchema>;
export type AuthUser = z.infer<typeof AuthUserSchema>;
export type AuthSession = z.infer<typeof SessionSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
