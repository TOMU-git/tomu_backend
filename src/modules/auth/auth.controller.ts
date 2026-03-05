import { Controller, Get, Post, Body, Inject, Res, Query, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import {
  CreateAdminDto,
  CreateStudentDto,
  CreateTeacherDto,
} from "../user/dto/create-users.dto";
import { ApiOperation, ApiQuery, ApiTags, ApiTooManyRequestsResponse } from "@nestjs/swagger";
import { Response } from "express";
import { PhoneNumberAlreadyExist } from "./exception/auth.exception";
import {
  AccessAuthDto,
  ForgotPassword,
  LoginAuthDto,
  SentSmsDto,
  VerifyDto,
  GoogleMobileAuthDto,
  AppleMobileAuthDto,
} from "./dto/auth.dto";
import { IUserService } from "../user/interfaces/user.service";
import { Auth } from "src/common/decorator/auth.decorator";
import { RoleEnum } from "src/common/enums/enum";
import { SmsRateLimitGuard, RateLimitGuard } from "./guards/sms-rate-limit.guard";
import { GoogleOAuthGuard } from "./guards/google-oauth.guard";
import { AppleOAuthGuard } from "./guards/apple-oauth.guard";
import { IOAuthProfile } from "./interfaces/oauth-profile.interface";
import { Req } from "@nestjs/common";

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
    description:
      "Enhanced login endpoint that supports device management. Device information is optional for backward compatibility.",
  })
  @Post("sign-in/users/v2")
  async loginWithDevice(
    @Body() loginDto: LoginAuthDto & { deviceInfo?: any },
    @Res() res: Response,
  ) {
    const found = await this.authService.login(
      loginDto,
      res,
      loginDto.deviceInfo,
    );
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
    description: "Check if device management is supported by the backend",
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
        "security_levels",
      ],
    };
  }

  // **** Regenerate the refresh token **** //

  @Post("forgot-password")
  async forgotPassword(@Body() forgotDto: ForgotPassword) {
    return await this.authService.forgotPass(forgotDto);
  }

  @ApiQuery({
    name: "refresh_token",
    required: false,
    type: String,
    description: "For regenerating the refresh token",
  })
  @UseGuards(RateLimitGuard(20)) // 20 ta so'rov minutiga

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

  @ApiOperation({
    summary: "Send SMS verification code",
    description: "Send SMS verification code to phone number. Limited to 5 requests per minute per phone number.",
  })
  @ApiTooManyRequestsResponse({
    description: "Too many requests. Maximum 5 requests per minute per phone number.",
  })
  @Post("send-sms")
  @UseGuards(SmsRateLimitGuard)
  async SentSms(@Body() sentSms: SentSmsDto) {
    console.log('[Auth Controller] POST /send-sms endpoint hit');
    console.log('[Auth Controller] Request body:', sentSms);
    console.log('[Auth Controller] Request headers:', sentSms);
    console.log('[Auth Controller] Request query:', sentSms);
    console.log('[Auth Controller] Request params:', sentSms);

    try {
      const result = await this.authService.sentSms(sentSms);
      console.log('[Auth Controller] SMS sent successfully, returning result');
      console.log('[Auth Controller] Response body:', result);
      console.log('[Auth Controller] Response headers:', result);
      console.log('[Auth Controller] Response status code:', result);
      return result;
    } catch (error) {
      console.error('[Auth Controller] Error in SentSms endpoint:', error.message);
      console.error('[Auth Controller] Error details:', {
        name: error.name,
        status: error.status,
        stack: error.stack,
      });
      throw error;
    }
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

  // **** OAuth Endpoints **** //

  /**
   * Google OAuth - Initiate authentication
   * GET /api/auth/google
   * Redirects user to Google login page
   */
  @ApiOperation({
    summary: "Initiate Google OAuth authentication",
    description: "Redirects user to Google login page for authentication",
  })
  @Get("google")
  @UseGuards(GoogleOAuthGuard)
  async googleAuth() {
    // Guard redirects to Google
  }

  /**
   * Google OAuth - Callback handler
   * GET /api/auth/google/callback
   * Google redirects here after successful authentication
   */
  @ApiOperation({
    summary: "Google OAuth callback",
    description: "Handles Google OAuth callback and creates/updates user",
  })
  @Get("google/callback")
  @UseGuards(GoogleOAuthGuard)
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
    const profile: IOAuthProfile = req.user;
    const result = await this.authService.validateGoogleUser(profile, res);

    // Redirect to frontend with tokens
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/auth/callback?access_token=${result.data.tokens.access_token}`;

    res.redirect(redirectUrl);
  }

  /**
   * Apple OAuth - Initiate authentication
   * GET /api/auth/apple
   * Redirects user to Apple Sign In page
   */
  @ApiOperation({
    summary: "Initiate Apple OAuth authentication",
    description: "Redirects user to Apple Sign In page for authentication",
  })
  @Get("apple")
  @UseGuards(AppleOAuthGuard)
  async appleAuth() {
    // Guard redirects to Apple
  }

  /**
   * Apple OAuth - Callback handler
   * POST /api/auth/apple/callback
   * Apple redirects here after successful authentication
   */
  @ApiOperation({
    summary: "Apple OAuth callback",
    description: "Handles Apple OAuth callback and creates/updates user",
  })
  @Post("apple/callback")
  @UseGuards(AppleOAuthGuard)
  async appleAuthCallback(@Req() req: any, @Res() res: Response) {
    const profile: IOAuthProfile = req.user;
    const result = await this.authService.validateAppleUser(profile, res);

    // Redirect to frontend with tokens
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/auth/callback?access_token=${result.data.tokens.access_token}`;

    res.redirect(redirectUrl);
  }

  /**
   * Google OAuth - Mobile SDK integration
   * POST /api/auth/google/mobile
   * App SDK sends idToken here for verification
   */
  @ApiOperation({
    summary: "Google OAuth for Mobile SDKs",
    description: "Verifies idToken received from Google SDK on iOS/Android and returns JWT",
  })
  @Post("google/mobile")
  async googleMobileAuth(@Body() dto: GoogleMobileAuthDto, @Res() res: Response) {
    const result = await this.authService.verifyGoogleMobileToken(dto.idToken, res);
    res.send(result);
  }

  /**
   * Apple OAuth - Mobile SDK integration
   * POST /api/auth/apple/mobile
   * App SDK sends identityToken here for verification
   */
  @ApiOperation({
    summary: "Apple OAuth for Mobile SDKs",
    description: "Verifies identityToken received from Apple Sign In on iOS/Android and returns JWT",
  })
  @Post("apple/mobile")
  async appleMobileAuth(@Body() dto: AppleMobileAuthDto, @Res() res: Response) {
    const result = await this.authService.verifyAppleMobileToken(
      dto.identityToken,
      dto.firstName,
      dto.lastName,
      res
    );
    res.send(result);
  }
}
