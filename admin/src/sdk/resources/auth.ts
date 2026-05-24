import type {
  AuthSession,
  AuthUser,
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  LoginResponse,
  RefreshInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "@/contract";
import {
  ChangePasswordInputSchema,
  ForgotPasswordInputSchema,
  LoginInputSchema,
  PATHS,
  RefreshInputSchema,
  RegisterInputSchema,
  ResetPasswordInputSchema,
  VerifyEmailInputSchema,
} from "@/contract";

import type { RequestOptions, SdkClient } from "../client";

export class AuthResource {
  constructor(private readonly client: SdkClient) {}

  getPublicConfig(options?: import('../client').RequestOptions): Promise<{
    registrationOpen: boolean;
    passwordMinLength: number;
    maintenanceMode: boolean;
    appName: string;
  }> {
    return this.client.get('/api/v1/auth/config', options);
  }

  register(
    input: RegisterInput,
    options?: RequestOptions,
  ): Promise<LoginResponse> {
    return this.client.post<LoginResponse>(
      PATHS.auth.register,
      RegisterInputSchema.parse(input),
      {
        ...options,
        skipAuth: true,
      },
    );
  }

  login(input: LoginInput, options?: RequestOptions): Promise<LoginResponse> {
    return this.client.post<LoginResponse>(
      PATHS.auth.login,
      LoginInputSchema.parse(input),
      {
        ...options,
        skipAuth: true,
      },
    );
  }

  refresh(
    input: RefreshInput,
    options?: RequestOptions,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.client.post(
      PATHS.auth.refresh,
      RefreshInputSchema.parse(input),
      {
        ...options,
        skipAuth: true,
      },
    );
  }

  me(
    options?: RequestOptions,
  ): Promise<
    AuthUser & {
      phone?: string | null;
      avatarUrl?: string | null;
      createdAt?: string;
    }
  > {
    return this.client.get(PATHS.auth.me, options);
  }

  logout(options?: RequestOptions): Promise<void> {
    return this.client.post(PATHS.auth.logout, undefined, options);
  }

  logoutAll(options?: RequestOptions): Promise<void> {
    return this.client.post(PATHS.auth.logoutAll, undefined, options);
  }

  forgotPassword(
    input: ForgotPasswordInput,
    options?: RequestOptions,
  ): Promise<void> {
    return this.client.post(
      PATHS.auth.forgotPassword,
      ForgotPasswordInputSchema.parse(input),
      {
        ...options,
        skipAuth: true,
      },
    );
  }

  resetPassword(
    input: ResetPasswordInput,
    options?: RequestOptions,
  ): Promise<void> {
    return this.client.post(
      PATHS.auth.resetPassword,
      ResetPasswordInputSchema.parse(input),
      {
        ...options,
        skipAuth: true,
      },
    );
  }

  verifyEmail(
    input: VerifyEmailInput,
    options?: RequestOptions,
  ): Promise<void> {
    return this.client.post(
      PATHS.auth.verifyEmail,
      VerifyEmailInputSchema.parse(input),
      {
        ...options,
        skipAuth: true,
      },
    );
  }

  resendVerification(options?: RequestOptions): Promise<void> {
    return this.client.post(PATHS.auth.resendVerification, undefined, options);
  }

  changePassword(
    input: ChangePasswordInput,
    options?: RequestOptions,
  ): Promise<void> {
    return this.client.post(
      PATHS.auth.changePassword,
      ChangePasswordInputSchema.parse(input),
      options,
    );
  }

  requestOtp(phone: string, purpose: string, options?: RequestOptions): Promise<{ sent: boolean }> {
    return this.client.post<{ sent: boolean }>(
      '/api/v1/auth/otp/request',
      { phone, purpose },
      { ...options, skipAuth: true },
    );
  }

  loginWithOtp(phone: string, code: string, options?: RequestOptions): Promise<LoginResponse> {
    return this.client.post<LoginResponse>(
      '/api/v1/auth/login-otp',
      { phone, code },
      { ...options, skipAuth: true },
    );
  }

  loginWithPhone(phone: string, password: string, options?: RequestOptions): Promise<LoginResponse> {
    return this.client.post<LoginResponse>(
      '/api/v1/auth/login-phone',
      { phone, password },
      { ...options, skipAuth: true },
    );
  }

  listSessions(options?: RequestOptions): Promise<AuthSession[]> {
    return this.client.get<AuthSession[]>(PATHS.auth.sessions, options);
  }

  revokeSession(sessionId: string, options?: RequestOptions): Promise<void> {
    return this.client.delete(PATHS.auth.session(sessionId), options);
  }
}
