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

export interface ChannelVerification {
  channel: "PHONE" | "EMAIL" | "TELEGRAM" | "WHATSAPP";
  value: string | null;
  verified: boolean;
  verifiedAt: string | null;
}

export interface VerificationStatus {
  phone: ChannelVerification;
  email: ChannelVerification;
  telegram: ChannelVerification;
}

export class AuthResource {
  constructor(private readonly client: SdkClient) {}

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

  me(options?: RequestOptions): Promise<
    AuthUser & {
      phone?: string | null;
      avatarUrl?: string | null;
      createdAt?: string;
      verifications?: VerificationStatus;
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

  /** Sends a verification OTP to the current user's email address. */
  sendEmailOtp(options?: RequestOptions): Promise<void> {
    return this.client.post("/api/v1/auth/email-otp/send", undefined, options);
  }

  /** Verifies the current user's email with the OTP code. */
  verifyEmailOtp(code: string, options?: RequestOptions): Promise<void> {
    return this.client.post("/api/v1/auth/email-otp/verify", { code }, options);
  }

  /** Gets the current user's verification status for all channels. */
  getVerificationStatus(options?: RequestOptions): Promise<VerificationStatus> {
    return this.client.get("/api/v1/auth/verification/status", options);
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

  requestOtp(
    phone: string,
    purpose: string,
    options?: RequestOptions,
  ): Promise<{ sent: boolean }> {
    return this.client.post<{ sent: boolean }>(
      "/api/v1/auth/otp/request",
      { phone, purpose },
      { ...options, skipAuth: true },
    );
  }

  loginWithOtp(
    phone: string,
    code: string,
    options?: RequestOptions,
  ): Promise<LoginResponse> {
    return this.client.post<LoginResponse>(
      "/api/v1/auth/login-otp",
      { phone, code },
      { ...options, skipAuth: true },
    );
  }

  loginWithPhone(
    phone: string,
    password: string,
    options?: RequestOptions,
  ): Promise<LoginResponse> {
    return this.client.post<LoginResponse>(
      "/api/v1/auth/login-phone",
      { phone, password },
      { ...options, skipAuth: true },
    );
  }

  /** Verifies the user's phone with the OTP sent at registration. */
  verifyPhone(
    phone: string,
    code: string,
    options?: RequestOptions,
  ): Promise<{ success: boolean }> {
    return this.client.post<{ success: boolean }>(
      "/api/v1/auth/verify-phone",
      { phone, code },
      { ...options, skipAuth: true },
    );
  }

  /** Step 1 of changing the phone number · sends an OTP to the new number. */
  requestPhoneChange(
    phone: string,
    options?: RequestOptions,
  ): Promise<{ sent: boolean }> {
    return this.client.post<{ sent: boolean }>(
      "/api/v1/auth/phone/change/request",
      { phone },
      options,
    );
  }

  /** Step 2 of changing the phone number · confirms the OTP and updates it. */
  confirmPhoneChange(
    phone: string,
    code: string,
    options?: RequestOptions,
  ): Promise<{ success: boolean; phone: string }> {
    return this.client.post<{ success: boolean; phone: string }>(
      "/api/v1/auth/phone/change/confirm",
      { phone, code },
      options,
    );
  }

  /** Step 1 of changing the email · sends an OTP to the new email. */
  requestEmailChange(
    email: string,
    options?: RequestOptions,
  ): Promise<{ sent: boolean }> {
    return this.client.post<{ sent: boolean }>(
      "/api/v1/auth/email/change/request",
      { email },
      options,
    );
  }

  /** Step 2 of changing the email · confirms the OTP and updates it. */
  confirmEmailChange(
    email: string,
    code: string,
    options?: RequestOptions,
  ): Promise<{ success: boolean; email: string }> {
    return this.client.post<{ success: boolean; email: string }>(
      "/api/v1/auth/email/change/confirm",
      { email, code },
      options,
    );
  }

  listSessions(options?: RequestOptions): Promise<AuthSession[]> {
    return this.client.get<AuthSession[]>(PATHS.auth.sessions, options);
  }

  revokeSession(sessionId: string, options?: RequestOptions): Promise<void> {
    return this.client.delete(PATHS.auth.session(sessionId), options);
  }
}
