import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import {
  AccessAuthDto,
  ForgotPassword,
  LoginAuthDto,
  SentSmsDto,
  VerifyDto,
} from "./dto/auth.dto";
import { JwtService } from "@nestjs/jwt";
import { IUserService } from "../user/interfaces/user.service";
import { hashed, compare } from "src/lib/bcrypt";
import { ResData } from "src/lib/resData";
import { IAuthService, ILoginData, SmsSent } from "./interface/auth.service";
import { User } from "../user/entities/user.entity";
import { IUserRepository } from "../user/interfaces/user.repository";
import {
  CreateAdminDto,
  CreateStudentDto,
  CreateTeacherDto,
} from "../user/dto/create-users.dto";
import { RoleEnum } from "src/common/enums/enum";
import { config } from "src/common/config";
import { Response } from "express";
import {
  InvalidRefreshToken,
  PhoneOrPasswordWrongException,
} from "./exception/auth.exception";
import { Cache } from "cache-manager";
import { generate } from "../../lib/genearotorCode";
import { SmsService } from "../../lib/smsService";
import { ICourseService } from "../course/interfaces/course.service";
import { IDeviceService } from "src/modules/user-device/interfaces/device.service";
import { DeviceInfoDto } from "src/modules/user-device/dto/device-info.dto";

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    private jwtService: JwtService,
    @Inject("IUserService") private readonly userService: IUserService,
    @Inject("IUserRepository") private readonly userRepository: IUserRepository,
    @Inject("CACHE_MANAGER") private cacheManager: Cache,
    @Inject("ICourseService") private readonly courseService: ICourseService,
    private readonly smsService: SmsService,
    @Inject("IDeviceService") private readonly deviceService: IDeviceService,
  ) { }

  // *** Login for only students *** //

  async login(dto: LoginAuthDto, res: Response, deviceInfo?: any): Promise<ResData<ILoginData>> {
    const { data: foundUser } = await this.userService.findOneByPhoneNumber(
      dto.phoneNumber,
    );

    if (!foundUser) {
      throw new PhoneOrPasswordWrongException();
    }
    const compared = await compare(dto.password, foundUser.password);
    if (!compared) {
      throw new PhoneOrPasswordWrongException();
    }
    const access_token = await this.jwtService.signAsync(
      { id: foundUser.id },
      { secret: config.jwtSecretKey, expiresIn: config.jwtExpiredIn },
    );
    const refresh_token = await this.jwtService.signAsync(
      { id: foundUser.id },
      { secret: config.jwtRefreshKey, expiresIn: config.jwtRefreshExpiresIn },
    );
    foundUser.hashed_refresh_token = await hashed(refresh_token);
    const updated = await this.userRepository.update(foundUser);
    res.cookie("refresh_token", refresh_token, {
      httpOnly: true,
      maxAge: config.jwtCookieTime,
    });

    // Register device if deviceInfo is provided and device management is enabled for the user
    if (deviceInfo && foundUser.deviceManagementEnabled) {
      try {
        await this.deviceService.registerDevice(foundUser.id, deviceInfo);
      } catch (error) {
        // If device registration fails, throw the error to prevent login
        console.error('Device registration failed:', error);
        console.error('Error details:', error.message);
        throw error; // Throw the error to prevent login when device limit is exceeded
      }
    }

    return new ResData<ILoginData>(
      "User successfully logged in",
      HttpStatus.OK,
      {
        data: foundUser,
        tokens: { access_token, refresh_token },
      },
    );
  }

  async refreshToken(
    refreshToken: string,
    res: Response,
  ): Promise<ResData<ILoginData>> {
    console.log('🔄 REFRESH TOKEN REQUEST STARTED');
    console.log('📝 Incoming refresh token:', refreshToken?.substring(0, 20) + '...');

    try {
      const verified = await this.jwtService.verifyAsync(refreshToken, {
        secret: config.jwtRefreshKey,
      });
      console.log('✅ Token verified successfully for user ID:', verified.id);

      if (!verified) {
        console.log('❌ Token verification failed');
        throw new InvalidRefreshToken();
      }

      const { data: foundUser } = await this.userService.findOneById(verified.id);
      console.log('👤 Found user:', foundUser?.id, foundUser?.firstName);

      // const tokenMatch = await compare(refreshToken, foundUser.hashed_refresh_token);
      // if (!foundUser) {
      //   throw new InvalidRefreshToken();
      // }

      console.log('🔑 Generating new access token with secret:', config.jwtSecretKey?.substring(0, 5) + '...');
      const access_token = await this.jwtService.signAsync(
        { id: foundUser.id },
        { secret: config.jwtSecretKey, expiresIn: config.jwtExpiredIn },
      );
      console.log('✅ New access token generated:', access_token?.substring(0, 20) + '...');

      console.log('🔄 Generating new refresh token with secret:', config.jwtRefreshKey?.substring(0, 5) + '...');
      const refresh_token = await this.jwtService.signAsync(
        { id: foundUser.id },
        { secret: config.jwtRefreshKey, expiresIn: config.jwtRefreshExpiresIn },
      );
      console.log('✅ New refresh token generated:', refresh_token?.substring(0, 20) + '...');

      foundUser.hashed_refresh_token = await hashed(refresh_token);
      const updated = await this.userRepository.update(foundUser);
      console.log('💾 User updated with new hashed refresh token');

      res.cookie("refresh_token", refresh_token, {
        httpOnly: true,
        maxAge: config.jwtCookieTime,
      });

      console.log('🍪 Cookie set successfully');
      console.log('✅ REFRESH TOKEN REQUEST COMPLETED SUCCESSFULLY');

      return new ResData<ILoginData>("User refreshed", HttpStatus.OK, {
        data: updated,
        tokens: { access_token, refresh_token },
      });
    } catch (error) {
      console.log('❌ REFRESH TOKEN ERROR:', error.message);
      console.log('📊 Error details:', error);
      throw error;
    }
  }

  // *** Admin register only *** //

  async createAdmin(
    dto: CreateAdminDto,
    res: Response,
  ): Promise<ResData<ILoginData>> {
    // Check if phone number already exists (using repository directly to avoid exception)
    const foundPhoneNumber = await this.userRepository.getOntByPhoneNumber(dto.phoneNumber);
    if (foundPhoneNumber) {
      throw new HttpException("This number already registered", 400);
    }
    const createdUser = new User();
    createdUser.firstName = dto.firstName;
    createdUser.lastName = dto.lastName;
    createdUser.phoneNumber = dto.phoneNumber;
    createdUser.gender = dto.gender;
    createdUser.password = await hashed(dto.password);
    createdUser.unhashedPassword = dto.password;
    createdUser.role = RoleEnum.ADMIN;
    const savedUser = await this.userRepository.create(createdUser);
    const access_token = await this.jwtService.signAsync({ id: savedUser.id });
    const refresh_token = await this.jwtService.signAsync(
      { id: savedUser.id },
      { secret: config.jwtRefreshKey, expiresIn: config.jwtRefreshExpiresIn },
    );
    // Use savedUser directly instead of fetching again - it's already the saved entity with ID
    savedUser.hashed_refresh_token = await hashed(refresh_token);
    const updated = await this.userRepository.update(savedUser);
    res.cookie("refresh_token", refresh_token, {
      httpOnly: true,
      maxAge: config.jwtCookieTime,
    });
    return new ResData<ILoginData>(
      "User created successfully",
      HttpStatus.CREATED,
      { data: updated, tokens: { access_token, refresh_token } },
    );
  }

  // *** User register only *** //

  async createStudent(
    dto: CreateStudentDto,
    res: Response,
  ): Promise<ResData<ILoginData>> {
    // Check if phone number already exists (using repository directly to avoid exception)
    const foundPhoneNumber = await this.userRepository.getOntByPhoneNumber(dto.phoneNumber);
    if (foundPhoneNumber) {
      throw new HttpException("This number already registered", 400);
    }
    const createdUser = new User();
    createdUser.firstName = dto.firstName;
    createdUser.lastName = dto.lastName;
    createdUser.phoneNumber = dto.phoneNumber;
    createdUser.gender = dto.gender;
    createdUser.password = await hashed(dto.password);
    createdUser.unhashedPassword = dto.password;
    createdUser.role = RoleEnum.STUDENT;
    const savedUser = await this.userRepository.create(createdUser);
    const access_token = await this.jwtService.signAsync({ id: savedUser.id });
    const refresh_token = await this.jwtService.signAsync(
      { id: savedUser.id },
      { secret: config.jwtSecretKey, expiresIn: config.jwtExpiredIn },
    );
    // Use savedUser directly instead of fetching again - it's already the saved entity with ID
    savedUser.hashed_refresh_token = await hashed(refresh_token);
    const updated = await this.userRepository.update(savedUser);
    res.cookie("refresh_token", refresh_token, {
      httpOnly: true,
      maxAge: config.jwtCookieTime,
    });
    return new ResData<ILoginData>(
      "User created successfully",
      HttpStatus.CREATED,
      { data: updated, tokens: { access_token, refresh_token } },
    );
  }

  async sentSms(sendSmsDto: SentSmsDto): Promise<ResData<SmsSent>> {
    console.log('[Auth Service] sentSms called for phone:', sendSmsDto.phone);

    try {
      const generatedCode = generate();
      console.log('[Auth Service] Generated verification code:', generatedCode);

      const message = `Assalomu alaykum. TOMU platformasi uchun tasdiqlash kodi: ${generatedCode}. Kodni hech kimga bermang.`;
      console.log('[Auth Service] Message prepared, calling SMS service...');

      await this.smsService.sendSMS(sendSmsDto.phone, message);
      console.log('[Auth Service] SMS service call completed successfully');

      await this.cacheManager.set(sendSmsDto.phone, generatedCode, 120000);
      console.log('[Auth Service] Verification code cached for 2 minutes');

      return new ResData<SmsSent>("Message sent successfully", 200, {
        status: "success",
      });
    } catch (error) {
      console.error('[Auth Service] Error in sentSms:', error.message);
      console.error('[Auth Service] Error stack:', error.stack);
      console.error('[Auth Service] Error details:', {
        name: error.name,
        status: error.status,
        response: error.response,
      });
      throw error;
    }
  }

  async forgotPass(dto: ForgotPassword): Promise<ResData<SmsSent>> {
    const { data: foundUserPhone } =
      await this.userService.findOneByPhoneNumber(dto.phone);
    if (!foundUserPhone) {
      throw new HttpException("This phone number not found", 404);
    }
    const generatedCode = generate();

    const message = `Assalomu alaykum. TOMU platformasi uchun tasdiqlash kodi: ${generatedCode}. Kodni hech kimga bermang.`;

    await this.smsService.sendSMS(dto.phone, message);

    await this.cacheManager.set(dto.phone, generatedCode, 120000);
    return new ResData<SmsSent>("Message sent successfully", 200, {
      status: "success",
      id: foundUserPhone.id,
    });
  }

  // *** Teacher create only *** //

  async createTeacher(
    dto: CreateTeacherDto,
    res: Response,
  ): Promise<ResData<ILoginData>> {
    // Check if phone number already exists (using repository directly to avoid exception)
    const foundPhoneNumber = await this.userRepository.getOntByPhoneNumber(dto.phoneNumber);
    if (foundPhoneNumber) {
      throw new HttpException("This number already registered", 400);
    }
    await this.courseService.findOneById(dto.courseId);
    const createdUser = new User();
    createdUser.firstName = dto.firstName;
    createdUser.lastName = dto.lastName;
    createdUser.phoneNumber = dto.phoneNumber;
    createdUser.gender = dto.gender;
    createdUser.password = await hashed(dto.password);
    createdUser.unhashedPassword = dto.password;
    createdUser.role = RoleEnum.TEACHER;
    createdUser.courseId = dto.courseId;
    const savedUser = await this.userRepository.create(createdUser);
    const access_token = await this.jwtService.signAsync({ id: savedUser.id });
    const refresh_token = await this.jwtService.signAsync(
      { id: savedUser.id },
      { secret: config.jwtRefreshKey, expiresIn: config.jwtRefreshExpiresIn },
    );
    // Use savedUser directly instead of fetching again - it's already the saved entity with ID
    savedUser.hashed_refresh_token = await hashed(refresh_token);
    const updated = await this.userRepository.update(savedUser);
    res.cookie("refresh_token", refresh_token, {
      httpOnly: true,
      maxAge: config.jwtCookieTime,
    });
    return new ResData<ILoginData>(
      "User created successfully",
      HttpStatus.CREATED,
      { data: updated, tokens: { access_token, refresh_token } },
    );
  }

  async verifay(dto: VerifyDto): Promise<ResData<boolean>> {
    let chacked = false;
    const phoneCode = await this.cacheManager.get(dto.phone);
    const resData = new ResData<boolean>("Code is wrong", 400, chacked);
    if (phoneCode == dto.code) {
      await this.cacheManager.del(dto.phone);
      resData.data = true;
      resData.message = "Verified successfully";
      resData.statusCode = 200;
    }
    return resData;
  }

  async access(token: AccessAuthDto): Promise<ResData<User>> {
    const verified = await this.jwtService.verifyAsync(token.accessToken);
    if (!verified) {
      throw new HttpException("Invalid access token", HttpStatus.UNAUTHORIZED);
    }
    const { data: foundUser } = await this.userService.findOneById(verified.id);
    return new ResData<User>(
      "User found successfully",
      HttpStatus.OK,
      foundUser,
    );
  }
}
