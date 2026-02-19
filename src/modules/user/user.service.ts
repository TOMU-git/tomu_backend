import { HttpException, Inject, Injectable } from "@nestjs/common";
import { UpdateUserDto } from "./dto/update-user.dto";
import { IUserRepository } from "./interfaces/user.repository";
import { IUserEntityCount, IUserService } from "./interfaces/user.service";
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
  ) { }

  // *** Find user by phone number (only returns one) *** //

  async findOneByPhoneNumber(phoneNumber: string): Promise<ResData<User>> {
    const foundUser = await this.userRepository.getOntByPhoneNumber(phoneNumber);
    if (!foundUser) {
      throw new UserNotFound();
    }
    return new ResData<User>('found user by phone', 200, foundUser);
  }

  // *** Check phone number availability *** //
  async checkPhoneAvailability(phoneNumber: string): Promise<ResData<boolean>> {
    const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber;
    const userWithPlus = await this.userRepository.getOntByPhoneNumber(`+${normalizedPhone}`);
    const userWithoutPlus = await this.userRepository.getOntByPhoneNumber(normalizedPhone);
    const isAvailable = !userWithPlus && !userWithoutPlus;
    return new ResData<boolean>('phone availability checked', 200, isAvailable);
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

  async findAll(search: string, limit: number, page: number, role: string): Promise<ResData<IUserEntityCount>> {
    limit = limit > 0 ? limit : 10;
    page = page > 0 ? page : 1;
    page = (page - 1) * limit;
    if (role === 'teacher') {
      const foundUsers = await this.userRepository.findAllTeachers(search, limit, page);
      const totalPage = foundUsers.count / 10;
      return new ResData<IUserEntityCount>("Teachers found successfully", 200, { users: foundUsers.users, count: foundUsers.count, total_page: Math.ceil(totalPage) });
    } else if (role === 'admin' || role === 'director') {
      const foundUsers = await this.userRepository.findAllAdmins(search, limit, page)
      const totalPage = foundUsers.count / 10;
      return new ResData<IUserEntityCount>("Admins found successfully", 200, { users: foundUsers.users, count: foundUsers.count, total_page: Math.ceil(totalPage) });
    } else {
      const foundUsers = await this.userRepository.findAll(search, limit, page);
      const totalPage = foundUsers.count / 10;
      return new ResData<IUserEntityCount>("Users found successfully", 200, { users: foundUsers.users, count: foundUsers.count, total_page: Math.ceil(totalPage) });
    }
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
    if (dto.maxDevices !== undefined) {
      foundUser.maxDevices = dto.maxDevices;
    }
    if (dto.deviceManagementEnabled !== undefined) {
      foundUser.deviceManagementEnabled = dto.deviceManagementEnabled;
    }
    if (dto.telegramChatId) {
      foundUser.telegramChatId = dto.telegramChatId;
    }
    if (dto.telegramGroupLink) {
      foundUser.telegramGroupLink = dto.telegramGroupLink;
    }
    if (dto.telegramGroupChatId) {
      foundUser.telegramGroupChatId = dto.telegramGroupChatId;
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
