import { Inject, Injectable } from "@nestjs/common";
import { UpdateUserDto } from "./dto/update-user.dto";
import { IUserRepository } from "./interfaces/user.repository";
import { IUserService } from "./interfaces/user.service";
import { ResData } from "src/lib/resData";
import { User } from "./entities/user.entity";
import { UserNotFound } from "./exception/user.exception";
import { hashed } from "src/lib/bcrypt";

@Injectable()
export class UserService implements IUserService {
  constructor(
    @Inject("IUserRepository") private readonly userRepository: IUserRepository,
  ) {}

  // *** Find user by phone number *** //

  async findOneByPhoneNumber(phoneNumber: string): Promise<ResData<User>> {
    const foundUserByPhone =
      await this.userRepository.findByPhoneNumber(phoneNumber);
    const resData = new ResData<User>(
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
    const updated = await this.userRepository.update(foundUser);
    return new ResData<User>("User updated successfully", 200, updated);
  }

  // *** Delete user by id *** //

  async deleteUser(id: number): Promise<ResData<User>> {
    const deletedUser = await this.userRepository.delete(id);
    return new ResData<User>("User deleted successfully", 200, deletedUser);
  }
}
