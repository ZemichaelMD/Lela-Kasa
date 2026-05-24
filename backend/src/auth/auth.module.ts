import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { LocalStrategy } from "./local.strategy";
import { JwtStrategy } from "./jwt.strategy";
import { MailModule } from "../mail/mail.module";
import { SmsModule } from "../sms/sms.module";

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("auth.jwtAccessSecret") ?? "",
        // expiresIn typed as StringValue — cast via unknown to satisfy strict types
        signOptions: {
          expiresIn: (config.get<string>("auth.jwtAccessTtl") ??
            "15m") as unknown as number,
        },
      }),
    }),
    MailModule,
    SmsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
