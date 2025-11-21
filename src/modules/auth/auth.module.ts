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

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: config.jwtSecretKey,
      signOptions: { expiresIn: config.jwtExpiredIn },
    }),
    UserModule,
    CourseModule,
    UserDeviceModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, SmsService, SmsRateLimitGuard],
})
export class AuthModule { }
