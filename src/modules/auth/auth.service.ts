import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AccessAuthDto, LoginAuthDto } from './dto/auth.dto';
import { JwtService } from '@nestjs/jwt';
import { IUserService } from '../user/interfaces/user.service';
import { hashed, compare } from 'src/lib/bcrypt';
import { ResData } from 'src/lib/resData';
import { IAuthService, ILoginData } from './interface/auth.service';
import { User } from '../user/entities/user.entity';
import { IUserRepository } from '../user/interfaces/user.repository';
import { CreateAdminTeacherDto, CreateStudentDto } from '../user/dto/create-users.dto';
import { RoleEnum } from 'src/common/enums/enum';
import { config } from 'src/common/config';
import { Response } from 'express';
import { InvalidRefreshToken, PhoneOrPasswordWrongException } from './exception/auth.exception';

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    private jwtService: JwtService,
    @Inject('IUserService') private readonly userService: IUserService,
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
  ) {}

  async login(dto: LoginAuthDto, res: Response): Promise<ResData<ILoginData>> {
    const { data: foundUser } = await this.userService.findOneByPhoneNumber(
      dto.phoneNumber,

  // User registration only
    );

    if (!foundUser) {
      throw new PhoneOrPasswordWrongException();
    }
    const compared = await compare(dto.password, foundUser.password);
    if (!compared) {
      throw new PhoneOrPasswordWrongException();
    }
    const access_token = await this.jwtService.signAsync({ id: foundUser.id }, {secret: config.jwtSecretKey, expiresIn: config.jwtExpiredIn});
    const refresh_token = await this.jwtService.signAsync({ id: foundUser.id }, { secret: config.jwtRefreshKey, expiresIn: config.jwtRefreshExpiresIn });
    foundUser.hashed_refresh_token = await hashed(refresh_token);
    const updated = await this.userRepository.update(foundUser);
    res.cookie("refresh_token", refresh_token, {
      httpOnly: true,
      maxAge: config.jwtCookieTime,
    });
    return new ResData<ILoginData>("User successfully logged in", HttpStatus.OK, {
      data: foundUser,
      tokens: {access_token, refresh_token},
    });
  }

  async refreshToken(id: number, refreshToken: string, res: Response): Promise<ResData<ILoginData>> {
    const verified = await this.jwtService.verifyAsync(refreshToken, {secret: config.jwtRefreshKey} );
    if (!verified || verified.id != id) {
      throw new InvalidRefreshToken();
    }    
    const { data: foundUser } = await this.userService.findOneById(id);
    const tokenMatch = await compare(refreshToken, foundUser.hashed_refresh_token);
    if (!tokenMatch) {
      throw new InvalidRefreshToken();
    }
    const access_token = await this.jwtService.signAsync({ id: foundUser.id });
    const refresh_token = await this.jwtService.signAsync({ id: foundUser.id }, { secret: config.jwtRefreshKey, expiresIn: config.jwtRefreshExpiresIn });
    foundUser.hashed_refresh_token = await hashed(refresh_token);
    const updated = await this.userRepository.update(foundUser);
    res.cookie("refresh_token", refresh_token, {
      httpOnly: true,
      maxAge: config.jwtCookieTime,
    });
    return new ResData<ILoginData>("User refreshed", HttpStatus.OK, {
      data: updated,
      tokens: {access_token, refresh_token},
    });
  }

  async createAdminTeacher(dto: CreateAdminTeacherDto, res: Response): Promise<ResData<ILoginData>>{
    const createdUser = new User();
    createdUser.firstName = dto.firstName;
    createdUser.lastName = dto.lastName;
    createdUser.phoneNumber = dto.phoneNumber;
    createdUser.gender = dto.gender;
    createdUser.password = await hashed(dto.password);
    createdUser.role = dto.role;
    const savedUser = await this.userRepository.create(createdUser);
    const access_token = await this.jwtService.signAsync({ id: savedUser.id });
    const refresh_token = await this.jwtService.signAsync({ id: savedUser.id }, { secret: config.jwtRefreshKey, expiresIn: config.jwtRefreshExpiresIn });
    const { data: foundUser } = await this.userService.findOneById(savedUser.id);
    foundUser.hashed_refresh_token = await hashed(refresh_token);
    const updated = await this.userRepository.update(foundUser);
    res.cookie("refresh_token", refresh_token, {
      httpOnly: true,
      maxAge: config.jwtCookieTime,
    });
    return new ResData<ILoginData>("User created successfully", HttpStatus.CREATED, {data: updated, tokens: {access_token, refresh_token}});
   }
   
  async createStudent(dto: CreateStudentDto, res: Response): Promise<ResData<ILoginData>>{
    const createdUser = new User();
    createdUser.firstName = dto.firstName;
    createdUser.lastName = dto.lastName;
    createdUser.phoneNumber = dto.phoneNumber;
    createdUser.gender = dto.gender;
    createdUser.password = await hashed(dto.password);
    createdUser.role = RoleEnum.STUDENT;
    const savedUser = await this.userRepository.create(createdUser);
    const access_token = await this.jwtService.signAsync({ id: savedUser.id });
    const refresh_token = await this.jwtService.signAsync({ id: savedUser.id }, { secret: config.jwtSecretKey, expiresIn: config.jwtExpiredIn });
    const { data: foundUser } = await this.userService.findOneById(savedUser.id);
    foundUser.hashed_refresh_token = await hashed(refresh_token);
    const updated = await this.userRepository.update(foundUser);
    res.cookie("refresh_token", refresh_token, {
      httpOnly: true,
      maxAge: config.jwtCookieTime,
    });
    return new ResData<ILoginData>("User created successfully", HttpStatus.CREATED, {data: updated, tokens: {access_token, refresh_token}});
  }

  async access (token: AccessAuthDto): Promise<ResData<User>>{
    const verified = await this.jwtService.verifyAsync(token.accessToken);
    if (!verified) {
      throw new HttpException("Invalid access token", HttpStatus.UNAUTHORIZED);
    }
    const { data: foundUser } = await this.userService.findOneById(verified.id);
    return new ResData<User>("User found successfully", HttpStatus.OK, foundUser);
  }
}
