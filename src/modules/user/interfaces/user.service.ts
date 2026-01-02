import { ResData } from "src/lib/resData";
import { UpdateUserDto } from "../dto/update-user.dto";
import { User } from "../entities/user.entity";

export interface IUserService {
  updateUser(id: number, dto: UpdateUserDto): Promise<ResData<User>>;
  findOneById(id: number): Promise<ResData<User>>;
  findOneByPhoneNumber(phoneNumber: string): Promise<ResData<User>>;
  findAll(search: string, limit: number, page: number, role: string): Promise<ResData<IUserEntityCount>>;
  deleteUser(id: number): Promise<ResData<User>>;
  checkPhoneAvailability(phoneNumber: string): Promise<ResData<boolean>>;
}

export interface IUserEntityCount {
  users: User[];
  count: number;
  total_page: number;
}