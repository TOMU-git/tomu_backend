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
  CreateAdminTeacherDto,
  CreateStudentDto,
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

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    private jwtService: JwtService,
    @Inject("IUserService") private readonly userService: IUserService,
    @Inject("IUserRepository") private readonly userRepository: IUserRepository,
    @Inject("CACHE_MANAGER") private cacheManager: Cache,
    private readonly smsService: SmsService,
  ) {}

  // *** Login for only students *** //

  async login(dto: LoginAuthDto, res: Response): Promise<ResData<ILoginData>> {
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
    const verified = await this.jwtService.verifyAsync(refreshToken, {
      secret: config.jwtRefreshKey,
    });
    if (!verified) {
      throw new InvalidRefreshToken();
    }
    const { data: foundUser } = await this.userService.findOneById(verified.id);
    // const tokenMatch = await compare(refreshToken, foundUser.hashed_refresh_token);
    // if (!foundUser) {
    //   throw new InvalidRefreshToken();
    // }
    const access_token = await this.jwtService.signAsync({ id: foundUser.id });
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
    return new ResData<ILoginData>("User refreshed", HttpStatus.OK, {
      data: updated,
      tokens: { access_token, refresh_token },
    });
  }

  // *** Admin register only *** //

  async createAdmin(
    dto: CreateAdminTeacherDto,
    res: Response,
  ): Promise<ResData<ILoginData>> {
    const createdUser = new User();
    createdUser.firstName = dto.firstName;
    createdUser.lastName = dto.lastName;
    createdUser.phoneNumber = dto.phoneNumber;
    createdUser.gender = dto.gender;
    createdUser.password = await hashed(dto.password);
    createdUser.role = RoleEnum.ADMIN;
    const { data: foundPhoneNumber } = await this.userService.findOneByPhoneNumber(dto.phoneNumber)
    if (foundPhoneNumber) {
      throw new HttpException("This number already registered", 400)
    }
    const savedUser = await this.userRepository.create(createdUser);
    const access_token = await this.jwtService.signAsync({ id: savedUser.id });
    const refresh_token = await this.jwtService.signAsync(
      { id: savedUser.id },
      { secret: config.jwtRefreshKey, expiresIn: config.jwtRefreshExpiresIn },
    );
    const { data: foundUser } = await this.userService.findOneById(
      savedUser.id,
    );
    foundUser.hashed_refresh_token = await hashed(refresh_token);
    const updated = await this.userRepository.update(foundUser);
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
    const createdUser = new User();
    createdUser.firstName = dto.firstName;
    createdUser.lastName = dto.lastName;
    createdUser.phoneNumber = dto.phoneNumber;
    createdUser.gender = dto.gender;
    createdUser.password = await hashed(dto.password);
    createdUser.role = RoleEnum.STUDENT;
    const { data: foundPhoneNumber } = await this.userService.findOneByPhoneNumber(dto.phoneNumber)
    if (foundPhoneNumber) {
      throw new HttpException("This number already registered", 400)
    }
    const savedUser = await this.userRepository.create(createdUser);
    const access_token = await this.jwtService.signAsync({ id: savedUser.id });
    const refresh_token = await this.jwtService.signAsync(
      { id: savedUser.id },
      { secret: config.jwtSecretKey, expiresIn: config.jwtExpiredIn },
    );
    const { data: foundUser } = await this.userService.findOneById(
      savedUser.id,
    );
    foundUser.hashed_refresh_token = await hashed(refresh_token);
    const updated = await this.userRepository.update(foundUser);
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
    const generatedCode = generate();

    const message = `Assalomu alaykum. TOMU platformasi uchun tasdiqlash kodi: ${generatedCode}. Kodni hech kimga bermang.`;

    await this.smsService.sendSMS(sendSmsDto.phone, message);

    await this.cacheManager.set(sendSmsDto.phone, generatedCode, 120000);
    return new ResData<SmsSent>("Message sent successfully", 200, {
      status: "success",
    });
  }

  async forgotPass(dto: ForgotPassword):Promise<ResData<SmsSent>> {
    const { data: foundUserPhone } = await this.userService.findOneByPhoneNumber(dto.phone);
    if (!foundUserPhone) {
      throw new HttpException("This phone number not found", 404)
    }
    const generatedCode = generate();

    const message = `Assalomu alaykum. TOMU platformasi uchun tasdiqlash kodi: ${generatedCode}. Kodni hech kimga bermang.`;

    await this.smsService.sendSMS(dto.phone, message);

    await this.cacheManager.set(dto.phone, generatedCode, 120000);
    return new ResData<SmsSent>("Message sent successfully", 200, {
      status: "success",
      id: foundUserPhone.id
    });
  }

  // *** Teacher create only *** //

  async createTeacher(
    dto: CreateAdminTeacherDto,
    res: Response,
  ): Promise<ResData<ILoginData>> {
    const createdUser = new User();
    createdUser.firstName = dto.firstName;
    createdUser.lastName = dto.lastName;
    createdUser.phoneNumber = dto.phoneNumber;
    createdUser.gender = dto.gender;
    createdUser.password = await hashed(dto.password);
    createdUser.role = RoleEnum.TEACHER;
    const { data: foundPhoneNumber } = await this.userService.findOneByPhoneNumber(dto.phoneNumber)
    if (foundPhoneNumber) {
      throw new HttpException("This number already registered", 400)
    }
    const savedUser = await this.userRepository.create(createdUser);
    const access_token = await this.jwtService.signAsync({ id: savedUser.id });
    const refresh_token = await this.jwtService.signAsync(
      { id: savedUser.id },
      { secret: config.jwtRefreshKey, expiresIn: config.jwtRefreshExpiresIn },
    );
    const { data: foundUser } = await this.userService.findOneById(
      savedUser.id,
    );
    foundUser.hashed_refresh_token = await hashed(refresh_token);
    const updated = await this.userRepository.update(foundUser);
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
    const resData = new ResData<boolean>("Code is wrong", 400, chacked)
    if (phoneCode == dto.code) {
      await this.cacheManager.del(dto.phone)
      resData.data = true;
      resData.message = "Verified successfully"
      resData.statusCode = 200
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
