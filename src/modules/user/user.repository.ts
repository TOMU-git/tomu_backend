import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { IUserRepository } from './interfaces/user.repository';
import { Repository } from 'typeorm';

export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  // CREAD
  async insert(entity: User): Promise<User> {
    return this.userRepository.save(entity);
  }

  // READ
  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }
  async findOneById(id: number): Promise<User> {
    return this.userRepository.findOneBy({ id });
  }
  async findByPhoneNumber(phoneNumber: string): Promise<User> {
    return this.userRepository.findOneBy({ phoneNumber });
  }

  // UPDATE
  async update(entity: User): Promise<User> {
    return this.userRepository.save(entity);
  }

  // DELETE
  async delete(id: number): Promise<User> {
    const foundUser = await this.findOneById(id);
    await this.userRepository.delete({ id });
    return foundUser;
  }
}
