import { User } from '../entities/user.entity';

export interface IUserRepository {
  insert(entity: User): Promise<User>;
  findAll(): Promise<Array<User>>;
  findOneById(id: number): Promise<User>;
  findByPhoneNumber(phoneNumber: string): Promise<User>;
  update(entity: User): Promise<User>;
  delete(id: number): Promise<User>;
}
