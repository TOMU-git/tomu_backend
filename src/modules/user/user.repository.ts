import { InjectRepository } from "@nestjs/typeorm";
import { User } from "./entities/user.entity";
import { IUserRepository } from "./interfaces/user.repository";
import { ILike, Repository } from "typeorm";

export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  // *** Create a new user *** //

  async create(entity: User): Promise<User> {
    return await this.userRepository.save(entity);
  }

  // *** Find all available users *** //

  async findAll(search: string, limit: number, offset: number): Promise<User[]> {
    let whereCondition = {};
    if (search && search.trim() !== "") {
      whereCondition = { phoneNumber: ILike(`%${search}%`) };
      const foundUsers = await this.userRepository.find({ skip: offset, take: limit, where: whereCondition });
      return foundUsers;
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
