import { Body, Inject, Injectable } from '@nestjs/common';
import {
  LoginAuthDto,
  RegisterOnlyUser,
  UpdatePasswordDto,
  UpdateProfileDto,
} from './dto/auth.dto';
import { JwtService } from '@nestjs/jwt';
import { IUserResData, IUserService } from '../user/interfaces/user.service';
import {
  AuthException,
  AuthIncorrectPassword,
} from './exception/auth.exception';
import { hashPassword, matchPassword } from 'src/lib/bcrypt';
import { ResData } from 'src/lib/resData';
import { IAuthService } from './interface/auth.service';
import { User } from '../user/entities/user.entity';
import { UserAlreadyExist } from '../user/exception/user.exception';
import { IUserRepository } from '../user/interfaces/user.repository';
import { RoleEnum } from 'src/common/enums/enum';

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    private jwtService: JwtService,
    @Inject('IUserService') private readonly userService: IUserService,
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
  ) {}

  // User registration only
  async registerOnlyUser(
    registerOnlyUser: RegisterOnlyUser,
  ): Promise<ResData<IUserResData>> {
    let newUser = new User();
    newUser = Object.assign(newUser, registerOnlyUser);

    newUser.password = await hashPassword(registerOnlyUser.password);
    newUser.role = RoleEnum.STUDENT;

    const createdUser = await this.userRepository.insert(newUser);
    const token = this.jwtService.sign({ id: createdUser.id });

    return new ResData<IUserResData>('User created successfully', 201, {
      user: createdUser,
      token,
    });
  }

  // Login
  async login(
    @Body() loginAuthDto: LoginAuthDto,
  ): Promise<ResData<IUserResData>> {
    const findByPhoneNumber = await this.userService._findByPhoneNumber(
      loginAuthDto.phoneNumber,
    );

    if (!findByPhoneNumber) {
      throw new AuthException();
    }

    const isMatch = await matchPassword(
      loginAuthDto.password,
      findByPhoneNumber.password,
    );

    if (!isMatch) {
      throw new AuthException();
    }

    const token = this.jwtService.sign({ id: findByPhoneNumber.id });

    return new ResData<IUserResData>('success', 200, {
      user: findByPhoneNumber,
      token,
    });
  }

  // Profile
  async profile(currentUser: User): Promise<ResData<User>> {
    const { data: foundUser } = await this.userService.findOne(currentUser.id);

    return new ResData<User>('success', 200, foundUser);
  }

  // Update profile
  async updateProfile(
    updateProfileDto: UpdateProfileDto,
    currentUser: User,
  ): Promise<ResData<User>> {
    const { data: foundUser } = await this.userService.findOne(currentUser.id);

    const foundByPhoneNumber = await this.userService._findByPhoneNumber(
      updateProfileDto.phoneNumber,
    );

    if (
      foundByPhoneNumber &&
      foundByPhoneNumber.phoneNumber !== foundUser.phoneNumber
    ) {
      throw new UserAlreadyExist();
    }

    const editedUser = Object.assign(foundUser, updateProfileDto);
    console.log('editedUser', editedUser);

    const updatedUser = await this.userRepository.update(editedUser);

    return new ResData<User>('updated', 200, updatedUser);
  }

  // Update password
  async updatePassword(
    updatePasswordDto: UpdatePasswordDto,
    currentUser: User,
  ): Promise<ResData<User>> {
    const { data: foundUser } = await this.userService.findOne(currentUser.id);

    const isMatch = await matchPassword(
      updatePasswordDto.currentPassword,
      foundUser.password,
    );
    if (!isMatch) {
      throw new AuthIncorrectPassword('Current password is incorrect');
    }

    if (updatePasswordDto.newPassword !== updatePasswordDto.confirmPassword) {
      throw new AuthIncorrectPassword(
        'The new password and confirmation password did not match.',
      );
    }

    foundUser.password = await hashPassword(updatePasswordDto.newPassword);

    const updatedUser = await this.userRepository.update(foundUser);

    return new ResData<User>('updated', 200, updatedUser);
  }
}
