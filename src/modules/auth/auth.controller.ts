import {
  Controller,
  Get,
  Post,
  Body,
  Inject,
  Res,
  Query,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import {
  CreateAdminDto,
  CreateStudentDto,
  CreateTeacherDto,
} from "../user/dto/create-users.dto";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { PhoneNumberAlreadyExist } from "./exception/auth.exception";
import {
  AccessAuthDto,
  ForgotPassword,
  LoginAuthDto,
  SentSmsDto,
  VerifyDto,
} from "./dto/auth.dto";
import { IUserService } from "../user/interfaces/user.service";
import { Auth } from "src/common/decorator/auth.decorator";
import { RoleEnum } from "src/common/enums/enum";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject("IUserService") private readonly userService: IUserService,
  ) { }
  // **** Login for all users **** //

  @ApiOperation({
    summary: "Log In user or admin by phone number and password",
  })
  @Post("sign-in/users")
  async login(@Body() loginDto: LoginAuthDto, @Res() res: Response) {
    const found = await this.authService.login(loginDto, res);
    res.send(found);
  }

  /**
   * Login with device information (V2 API)
   * Backward compatible - device info is optional
   */
  @ApiOperation({
    summary: "Log In user with device information (V2)",
    description: "Enhanced login endpoint that supports device management. Device information is optional for backward compatibility."
  })
  @Post("sign-in/users/v2")
  async loginWithDevice(
    @Body() loginDto: LoginAuthDto & { deviceInfo?: any },
    @Res() res: Response
  ) {
    const found = await this.authService.login(loginDto, res, loginDto.deviceInfo);
    res.send(found);
  }

  // **** Access validation **** //

  @Post("current")
  async access(@Body() accessDto: AccessAuthDto) {
    return await this.authService.access(accessDto);
  }

  /**
   * Check device management support
   * GET /api/auth/device-support
   */
  @ApiOperation({
    summary: "Check device management support",
    description: "Check if device management is supported by the backend"
  })
  @Get("device-support")
  async checkDeviceSupport() {
    return {
      supported: true,
      version: "2.0",
      features: [
        "device_registration",
        "device_limits",
        "device_management",
        "security_levels"
      ]
    };
  }

  // **** Regenerate the refresh token **** //


  @Post('forgot-password')
  async forgotPassword(@Body() forgotDto: ForgotPassword) {
    return await this.authService.forgotPass(forgotDto)
  }

  @ApiQuery({
    name: "refresh_token",
    required: false,
    type: String,
    description: "For regenerating the refresh token",
  })
  @Get("refresh")
  async refresh(
    @Query("refresh_token") refreshToken: string,
    @Res() res: Response,
  ) {
    const refreshed = await this.authService.refreshToken(refreshToken, res);
    res.send(refreshed);
  }

  // **** Register for students **** //

  @Post("register/students")
  async registerStudent(
    @Body() studentCreateDto: CreateStudentDto,
    @Res() res: Response,
  ) {
    try {
      const { data: foundUser } = await this.userService.findOneByPhoneNumber(
        studentCreateDto.phoneNumber,
      );

      if (foundUser) {
        throw new PhoneNumberAlreadyExist();
      }
    } catch (error) {
      // If UserNotFound exception, that's fine - user doesn't exist and can register
      if (error.status === 404) {
        // User doesn't exist, which is expected for registration - continue
      } else {
        // Other errors (like PhoneNumberAlreadyExist) should be thrown
        throw error;
      }
    }
    const createdUser = await this.authService.createStudent(
      studentCreateDto,
      res,
    );
    res.send(createdUser);
  }

  // **** Verifying code **** //

  @Post("verify-code")
  async VerifaySmsCode(@Body() verifayCode: VerifyDto) {
    return await this.authService.verifay(verifayCode);
  }

  // **** Sending sms to user **** //

  @Post("send-sms")
  async SentSms(@Body() sentSms: SentSmsDto) {
    return await this.authService.sentSms(sentSms);
  }

  // **** Register for admins and teachers **** //

  @Auth(RoleEnum.DIRECTOR)
  @Post("register/admin")
  async registerAdmin(
    @Body() adminCreateDto: CreateAdminDto,
    @Res() res: Response,
  ) {
    try {
      const { data: foundUser } = await this.userService.findOneByPhoneNumber(
        adminCreateDto.phoneNumber,
      );

      if (foundUser) {
        throw new PhoneNumberAlreadyExist();
      }
    } catch (error) {
      // If UserNotFound exception, that's fine - user doesn't exist and can register
      if (error.status === 404) {
        // User doesn't exist, which is expected for registration - continue
      } else {
        // Other errors (like PhoneNumberAlreadyExist) should be thrown
        throw error;
      }
    }
    const createdUser = await this.authService.createAdmin(adminCreateDto, res);
    res.send(createdUser);
  }

  // **** Create teacher **** //

  @Auth(RoleEnum.ADMIN)
  @Post("register/teacher")
  async registerTeacher(
    @Body() teacherCreateDto: CreateTeacherDto,
    @Res() res: Response,
  ) {
    try {
      const { data: foundUser } = await this.userService.findOneByPhoneNumber(
        teacherCreateDto.phoneNumber,
      );

      if (foundUser) {
        throw new PhoneNumberAlreadyExist();
      }
    } catch (error) {
      // If UserNotFound exception, that's fine - user doesn't exist and can register
      if (error.status === 404) {
        // User doesn't exist, which is expected for registration - continue
      } else {
        // Other errors (like PhoneNumberAlreadyExist) should be thrown
        throw error;
      }
    }
    const createdUser = await this.authService.createTeacher(
      teacherCreateDto,
      res,
    );
    res.send(createdUser);
  }
}
