import { HttpException, Inject, Injectable } from "@nestjs/common";
import { UpdateUserDto } from "./dto/update-user.dto";
import { IUserRepository } from "./interfaces/user.repository";
import { IUserService } from "./interfaces/user.service";
import { ResData } from "src/lib/resData";
import { User } from "./entities/user.entity";
import { UserNotFound } from "./exception/user.exception";
import { hashed } from "src/lib/bcrypt";
import { GenderEnum } from "src/common/enums/enum";
import { PhoneNumberAlreadyExist } from "../auth/exception/auth.exception";

@Injectable()
export class UserService implements IUserService {
  constructor(
    @Inject("IUserRepository") private readonly userRepository: IUserRepository,
  ) {}

  // *** Find user by phone number *** //

  async findByPhoneNumber(search: string, limit: number, page: number): Promise<ResData<User[]>> {
    limit = limit > 0 ? limit : 10;
    page = page > 0 ? page : 1;
    page = (page - 1) * limit;
    const foundUserByPhone = await this.userRepository.findByPhoneNumber(search, limit, page);
    const resData = new ResData<User[]>(
      "User found successfully",
      200,
      foundUserByPhone,
    );
    if (!foundUserByPhone) {
      resData.message = "User not found by phone number";
      resData.statusCode = 400;
    }
    return resData;
  }

  // *** Find user by phone number (only returns one) *** //

  async findOneByPhoneNumber(phoneNumber: string): Promise<ResData<User>> {
    const foundUser = await this.userRepository.getOntByPhoneNumber(phoneNumber);
    return new ResData<User>('found user by phone', 200, foundUser);
  }
  // *** Find one by id *** //

  async findOneById(id: number): Promise<ResData<User>> {
    const foundUserId = await this.userRepository.findOneById(id);
    if (!foundUserId) {
      throw new UserNotFound();
    }
    return new ResData<User>("User found successfully", 200, foundUserId);
  }
  // *** Find all available users *** //

  async findAll(): Promise<ResData<User[]>> {
    const foundUsers = await this.userRepository.findAll();
    return new ResData<User[]>("Users found successfully", 200, foundUsers);
  }

  // *** Update users by id *** //

  async updateUser(id: number, dto: UpdateUserDto): Promise<ResData<User>> {
    const { data: foundUser } = await this.findOneById(id);
    if (dto.firstName) {
      foundUser.firstName = dto.firstName;
    }
    if (dto.lastName) {
      foundUser.lastName = dto.lastName;
    }
    if (dto.phoneNumber) {
      foundUser.phoneNumber = dto.phoneNumber;
    }
    if (dto.gender) {
      foundUser.gender = dto.gender;
    }
    if (dto.password) {
      foundUser.password = await hashed(dto.password);
    }

    if (dto.password) {
      foundUser.unhashedPassword = dto.password;
    }
    const updated = await this.userRepository.update(foundUser);
    return new ResData<User>("User updated successfully", 200, updated);
  }

  // *** Delete user by id *** //

  async deleteUser(id: number): Promise<ResData<User>> {
    const deletedUser = await this.userRepository.delete(id);
    return new ResData<User>("User deleted successfully", 200, deletedUser);
  }
}
