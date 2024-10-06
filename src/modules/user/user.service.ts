import { Inject, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { IUserRepository } from './interfaces/user.repository';
import { IUserResData, IUserService } from './interfaces/user.service';
import { ResData } from 'src/lib/resData';
import { User } from './entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import {
  UserAlreadyExist,
  UserForbiddenException,
  UserNotFound,
} from './exception/user.exception';
import { RoleEnum } from 'src/common/enums/enum';
import { hashPassword } from 'src/lib/bcrypt';

@Injectable()
export class UserService implements IUserService {
  constructor(
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
    private jwtService: JwtService,
  ) {}

  // CREATE
  async create(
    createUserDto: CreateUserDto,
    currentUser: User,
  ): Promise<ResData<IUserResData>> {
    console.log('currentUser', currentUser);
    const findByPhoneNumber = await this._findByPhoneNumber(
      createUserDto.phoneNumber,
    );

    console.log('findByPhoneNumber', findByPhoneNumber);

    if (findByPhoneNumber) {
      throw new UserAlreadyExist();
    }

    let newUser = new User();
    newUser = Object.assign(newUser, createUserDto);

    if (
      currentUser.role === RoleEnum.STUDENT ||
      currentUser.role === RoleEnum.TEACHER
    ) {
      newUser.role = RoleEnum.STUDENT;
    } else if (
      currentUser.role === RoleEnum.ADMIN &&
      newUser.role === RoleEnum.DIRECTOR
    ) {
      throw new UserForbiddenException(
        'You do not have sufficient rights to create a user in this role.',
      );
    }

    newUser.password = await hashPassword(newUser.password);

    const createdUser = await this.userRepository.insert(newUser);
    const token = this.jwtService.sign({ id: createdUser.id });

    return new ResData<IUserResData>('created', 201, {
      user: createdUser,
      token,
    });
  }

  // READ
  async findAll(): Promise<ResData<User[]>> {
    const data = await this.userRepository.findAll();
    return new ResData<User[]>('ok', 200, data);
  }
  async findOne(id: number): Promise<ResData<User>> {
    const foundUser = await this.userRepository.findOneById(id);
    if (!foundUser) {
      throw new UserNotFound();
    }

    return new ResData<User>('ok', 200, foundUser);
  }

  async _findByPhoneNumber(phoneNumber: string): Promise<User> {
    return await this.userRepository.findByPhoneNumber(phoneNumber);
  }

  // UPDATE
  async update(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<ResData<User>> {
    throw new Error('Method not implemented.');
  }

  // DELETE
  async delete(id: number): Promise<ResData<User>> {
    throw new Error('Method not implemented.');
  }
}
