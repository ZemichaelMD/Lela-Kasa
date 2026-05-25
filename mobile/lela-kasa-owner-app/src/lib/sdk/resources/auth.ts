import type { RequestOptions, SdkClient } from '../client';

export interface LoginInput {
  email?: string;
  phone?: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

export interface RegisterInput {
  name: string;
  email?: string;
  password: string;
  shopName: string;
  phone: string;
}

export interface ChannelVerification {
  channel: 'PHONE' | 'EMAIL' | 'TELEGRAM' | 'WHATSAPP';
  value: string | null;
  verified: boolean;
  verifiedAt: string | null;
}

export interface VerificationStatus {
  phone: ChannelVerification;
  email: ChannelVerification;
  telegram: ChannelVerification;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  shopId: string;
  shop?: { id: string; name: string };
  phone?: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
  verifications?: VerificationStatus;
}

export interface SupportInfo {
  phone: string;
  email: string;
  telegram: string;
  whatsapp: string;
  hours: string;
  url: string;
  message: string;
}

export interface AuthConfig {
  registrationOpen: boolean;
  passwordMinLength: number;
  appName?: string;
  supportPhone?: string;
  support?: SupportInfo;
}

export class AuthResource {
  constructor(private readonly client: SdkClient) {}

  login(input: LoginInput, options?: RequestOptions): Promise<LoginResponse> {
    return this.client.post<LoginResponse>('/api/v1/auth/login', input, {
      ...options,
      skipAuth: true,
    });
  }

  loginWithPhone(phone: string, password: string, options?: RequestOptions): Promise<LoginResponse> {
    return this.client.post<LoginResponse>('/api/v1/auth/login-phone', { phone, password }, {
      ...options,
      skipAuth: true,
    });
  }

  register(input: RegisterInput, options?: RequestOptions): Promise<LoginResponse> {
    return this.client.post<LoginResponse>('/api/v1/auth/register', input, {
      ...options,
      skipAuth: true,
    });
  }

  config(options?: RequestOptions): Promise<AuthConfig> {
    return this.client.get<AuthConfig>('/api/v1/auth/config', {
      ...options,
      skipAuth: true,
    });
  }

  me(options?: RequestOptions): Promise<AuthUser> {
    return this.client.get<AuthUser>('/api/v1/auth/me', options);
  }

  logout(options?: RequestOptions): Promise<void> {
    return this.client.post('/api/v1/auth/logout', undefined, options);
  }

  changePassword(
    input: { currentPassword: string; newPassword: string },
    options?: RequestOptions,
  ): Promise<void> {
    return this.client.post('/api/v1/auth/change-password', input, options);
  }

  forgotPassword(input: { email: string }, options?: RequestOptions): Promise<void> {
    return this.client.post('/api/v1/auth/forgot-password', input, {
      ...options,
      skipAuth: true,
    });
  }

  forgotPasswordPhone(input: { phone: string }, options?: RequestOptions): Promise<void> {
    return this.client.post('/api/v1/auth/forgot-password-phone', input, {
      ...options,
      skipAuth: true,
    });
  }

  /** Requests an OTP delivered via SMS. `purpose` is e.g. 'phone_verification'. */
  requestOtp(phone: string, purpose: string, options?: RequestOptions): Promise<{ sent: boolean }> {
    return this.client.post<{ sent: boolean }>(
      '/api/v1/auth/otp/request',
      { phone, purpose },
      { ...options, skipAuth: true },
    );
  }

  /** Verifies a phone number with the OTP sent during registration. */
  verifyPhone(phone: string, code: string, options?: RequestOptions): Promise<{ success: boolean }> {
    return this.client.post<{ success: boolean }>(
      '/api/v1/auth/verify-phone',
      { phone, code },
      { ...options, skipAuth: true },
    );
  }

  /** Step 1 of changing the phone number — sends an OTP to the new number. */
  requestPhoneChange(phone: string, options?: RequestOptions): Promise<{ sent: boolean }> {
    return this.client.post<{ sent: boolean }>(
      '/api/v1/auth/phone/change/request',
      { phone },
      options,
    );
  }

  /** Step 2 of changing the phone number — confirms the OTP and updates it. */
  confirmPhoneChange(
    phone: string,
    code: string,
    options?: RequestOptions,
  ): Promise<{ success: boolean; phone: string }> {
    return this.client.post<{ success: boolean; phone: string }>(
      '/api/v1/auth/phone/change/confirm',
      { phone, code },
      options,
    );
  }

  /** Customer portal login with username + PIN */
  customerLogin(
    username: string,
    pin: string,
    options?: RequestOptions,
  ): Promise<CustomerLoginResponse> {
    return this.client.post<CustomerLoginResponse>(
      '/api/v1/auth/customer-login',
      { username, pin },
      { ...options, skipAuth: true },
    );
  }
}

export interface CustomerLoginResponse {
  accessToken: string;
  customer: {
    id: string;
    name: string;
    phone?: string;
    mustChangePassword?: boolean;
    passwordChangedAt?: string | null;
  };
}
