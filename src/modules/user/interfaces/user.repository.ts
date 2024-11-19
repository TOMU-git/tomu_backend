import { User } from "../entities/user.entity";

export interface IUserRepository {
  create(entity: User): Promise<User>;
  findAll(search: string, limit: number, page: number): Promise<IUserCount>;
  findAllTeachers(search: string, limit: number, page: number): Promise<IUserCount>;
  findAllAdmins(search: string, limit: number, page: number ): Promise<IUserCount>;
  findOneById(id: number): Promise<User>;
  getOntByPhoneNumber(phoneNumber: string): Promise<User>;
  update(entity: User): Promise<User>;
  delete(id: number): Promise<User>;
}

export interface IUserCount {
  users: Array<User>;
  count: number;
}
