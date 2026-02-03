import { InjectRepository } from "@nestjs/typeorm";
import { User } from "./entities/user.entity";
import { IUserCount, IUserRepository } from "./interfaces/user.repository";
import { ILike, Repository, In } from "typeorm";
import { RoleEnum } from "src/common/enums/enum";

export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) { }

  // *** Create a new user *** //

  async create(entity: User): Promise<User> {
    return await this.userRepository.save(entity);
  }

  // *** Find all available users *** //

  async findAll(
    search: string,
    limit: number,
    offset: number,
  ): Promise<IUserCount> {
    let whereCondition = {};
    if (search && search.trim() !== "") {
      whereCondition = {
        phoneNumber: ILike(`%${search}%`),
        role: RoleEnum.STUDENT,
      };
      const foundUsers = await this.userRepository.find({
        skip: offset,
        take: limit,
        where: whereCondition,
      });
      const count = foundUsers.length;
      return { users: foundUsers, count };
    } else {
      const foundUsers = await this.userRepository.find({
        skip: offset,
        take: limit,
        where: { role: RoleEnum.STUDENT },
      });
      const count = await this.userRepository
        .createQueryBuilder("users")
        .where({ role: RoleEnum.STUDENT })
        .select("COUNT(*) count")
        .getRawOne();
      return { users: foundUsers, count: parseInt(count.count, 10) };
    }
  }

  async findAllAdmins(
    search: string,
    limit: number,
    offset: number,
  ): Promise<IUserCount> {
    let whereCondition = {};
    if (search && search.trim() !== "") {
      whereCondition = {
        phoneNumber: ILike(`%${search}%`),
        role: In([RoleEnum.ADMIN, RoleEnum.DIRECTOR]),
      };
      const foundUsers = await this.userRepository.find({
        skip: offset,
        take: limit,
        where: whereCondition,
      });
      const count = foundUsers.length;
      return { users: foundUsers, count };
    } else {
      const foundUsers = await this.userRepository.find({
        skip: offset,
        take: limit,
        where: { role: In([RoleEnum.ADMIN, RoleEnum.DIRECTOR]) },
      });
      const count = await this.userRepository
        .createQueryBuilder("users")
        .where("users.role IN (:...roles)", { roles: [RoleEnum.ADMIN, RoleEnum.DIRECTOR] })
        .select("COUNT(*) count")
        .getRawOne();
      return { users: foundUsers, count: parseInt(count.count, 10) };
    }
  }

  async findAllTeachers(
    search: string,
    limit: number,
    offset: number,
  ): Promise<IUserCount> {
    let whereCondition = {};
    if (search && search.trim() !== "") {
      whereCondition = {
        role: RoleEnum.TEACHER,
        phoneNumber: ILike(`%${search}%`)
      };
      const foundUsers = await this.userRepository.find({
        skip: offset,
        take: limit,
        where: whereCondition,
      });
      const count = foundUsers.length;
      return { users: foundUsers, count };
    } else {
      const foundUsers = await this.userRepository.find({
        skip: offset,
        take: limit,
        where: { role: RoleEnum.TEACHER },
      });
      const count = await this.userRepository
        .createQueryBuilder("users")
        .where({ role: RoleEnum.TEACHER })
        .select("COUNT(*) count")
        .getRawOne();
      return { users: foundUsers, count: parseInt(count.count, 10) };
    }
  }

  // *** Find one user by id *** //

  async findOneById(id: number): Promise<User> {
    return await this.userRepository.findOneBy({ id });
  }

  async getOntByPhoneNumber(phoneNumber: string): Promise<User> {
    return await this.userRepository.findOneBy({ phoneNumber });
  }

  // *** Update user by id *** //

  async update(entity: User): Promise<User> {
    return await this.userRepository.save(entity);
  }

  // *** Delete user by id *** //

  async delete(id: number): Promise<User> {
    const foundUser = await this.findOneById(id);
    await this.userRepository.delete({ id });
    return foundUser;
  }
}
