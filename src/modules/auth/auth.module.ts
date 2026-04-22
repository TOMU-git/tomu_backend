import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { UserModule } from "../user/user.module";
import { JwtModule } from "@nestjs/jwt";
import { config } from "src/common/config";
import { SmsService } from "src/lib/smsService";
import { CourseModule } from "../course/course.module";
import { UserDeviceModule } from "../user-device/user-device.module";
import { SmsRateLimitGuard } from "./guards/sms-rate-limit.guard";
import { PassportModule } from "@nestjs/passport";
import { GoogleStrategy } from "./strategies/google.strategy";
import { AppleStrategy } from "./strategies/apple.strategy";
import { GoogleOAuthGuard } from "./guards/google-oauth.guard";
import { AppleOAuthGuard } from "./guards/apple-oauth.guard";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../user/entities/user.entity";
import { SmsLogModule } from "../sms-log/sms-log.module";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      global: true,
      secret: config.jwtSecretKey,
      signOptions: { expiresIn: config.jwtExpiredIn },
    }),
    TypeOrmModule.forFeature([User]),
    UserModule,
    CourseModule,
    UserDeviceModule,
    SmsLogModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SmsService,
    SmsRateLimitGuard,
    // OAuth strategies
    GoogleStrategy,
    GoogleOAuthGuard,
    // Apple OAuth - disabled until credentials are configured
    AppleStrategy,
    AppleOAuthGuard,
  ],
})
export class AuthModule { }
