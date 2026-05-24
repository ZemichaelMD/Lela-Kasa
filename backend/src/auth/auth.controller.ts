import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from "class-validator";

import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-user";

// ── DTOs ──────────────────────────────────────────────────────────────────────

export class RegisterDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  shopName!: string;

  @IsString()
  @IsNotEmpty()
  // Phone-like: digits with optional leading + and spaces/dashes. The exact
  // Ethiopian-format check + normalization happens in AuthService.register().
  @Matches(/^[+]?[0-9\s-]{9,16}$/, {
    message: "Enter a valid phone number, e.g. 0927646246",
  })
  phone!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}

class RequestOtpDto {
  @IsString() @IsNotEmpty() declare phone: string;
  @IsString() @IsNotEmpty() declare purpose: string;
}

class LoginOtpDto {
  @IsString() @IsNotEmpty() declare phone: string;
  @IsString() @Length(6, 6) declare code: string;
}

class LoginPhoneDto {
  @IsString() @IsNotEmpty() declare phone: string;
  @IsString() @IsNotEmpty() declare password: string;
}

class PhoneChangeRequestDto {
  @IsString() @IsNotEmpty() declare phone: string;
}

class PhoneChangeConfirmDto {
  @IsString() @IsNotEmpty() declare phone: string;
  @IsString() @Length(6, 6) declare code: string;
}

// ── Throttle helper ───────────────────────────────────────────────────────────

/** Strict per-IP throttle for credential / token endpoints (10/min). */
const AuthThrottle = () => Throttle({ auth: { limit: 10, ttl: 60_000 } });

// ── Controller ────────────────────────────────────────────────────────────────

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("config")
  @Public()
  @ApiOperation({
    summary: "Get public registration config and password policy",
  })
  async getPublicConfig() {
    const settings = await this.prisma.systemSetting.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;
    return {
      registrationOpen: map["registration_open"] !== "false",
      passwordMinLength: parseInt(map["password_min_length"] || "8", 10),
      maintenanceMode: map["maintenance_mode"] === "true",
      appName: map["app_name"] || "Lela Kasa",
      supportPhone: map["support_phone"] || "",
      // Support contact details — surfaced in the client and mobile apps so
      // owners can reach the operator. Edited from the admin app.
      support: {
        phone: map["support_phone"] || "",
        email: map["support_email"] || "",
        telegram: map["support_telegram"] || "",
        whatsapp: map["support_whatsapp"] || "",
        hours: map["support_hours"] || "",
        url: map["support_url"] || "",
        message: map["support_message"] || "",
      },
    };
  }

  @Post("register")
  @Public()
  @AuthThrottle()
  @ApiOperation({ summary: "Register a new owner account with a shop" })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("login")
  @Public()
  @AuthThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login with email and password" })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("refresh")
  @Public()
  @AuthThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rotate access + refresh tokens" })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revoke this session" })
  async logout(@CurrentUser() user: AuthenticatedUser) {
    if (user.sessionId) await this.authService.logout(user.sessionId);
  }

  @Get("me")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user profile with shop" })
  me(@CurrentUser() user: AuthenticatedUser) {
    if (user.role === "CUSTOMER") {
      return this.authService.customerMe(user.id);
    }
    return this.authService.me(user.id);
  }

  @Post("forgot-password")
  @Public()
  @AuthThrottle()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Request a password reset email (no email enumeration)",
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
  }

  @Post("reset-password")
  @Public()
  @AuthThrottle()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Reset password using token from email" })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post("verify-email")
  @Public()
  @AuthThrottle()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Verify email address with token from email" })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.authService.verifyEmail(dto.token);
  }

  @Post("otp/request")
  @Public()
  @AuthThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request an OTP sent via SMS" })
  async requestOtp(@Body() dto: RequestOtpDto) {
    await this.authService.requestOtp(dto.phone, dto.purpose);
    return { sent: true };
  }

  @Post("login-otp")
  @Public()
  @AuthThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login with phone number and OTP" })
  loginWithOtp(@Body() dto: LoginOtpDto) {
    return this.authService.loginWithOtp(dto.phone, dto.code);
  }

  @Post("login-phone")
  @Public()
  @AuthThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login with phone number and password" })
  loginWithPhone(@Body() dto: LoginPhoneDto) {
    return this.authService.loginWithPhone(dto.phone, dto.password);
  }

  @Post("verify-phone")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify phone with OTP after registration" })
  verifyPhone(@Body() dto: { phone: string; code: string }) {
    return this.authService.verifyPhone(dto.phone, dto.code);
  }

  @Post("phone/change/request")
  @AuthThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Send an OTP to a new phone number to change it" })
  async requestPhoneChange(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PhoneChangeRequestDto,
  ) {
    await this.authService.requestPhoneChange(user.id, dto.phone);
    return { sent: true };
  }

  @Post("phone/change/confirm")
  @AuthThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Confirm a phone number change with the OTP" })
  confirmPhoneChange(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PhoneChangeConfirmDto,
  ) {
    return this.authService.confirmPhoneChange(user.id, dto.phone, dto.code);
  }

  @Post("customer-login")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Customer login with username and PIN" })
  customerLogin(@Body() dto: { username: string; pin: string }) {
    return this.authService.customerLogin(dto.username, dto.pin);
  }
}
