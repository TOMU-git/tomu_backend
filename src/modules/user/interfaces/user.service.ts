import { ResData } from 'src/lib/resData';
import { CreateAdminTeacherDto, CreateStudentDto } from '../dto/create-users.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../entities/user.entity';

export interface IUserService {
  updateUser(id: number, dto: UpdateUserDto): Promise<ResData<User>>;
  findOneById(id: number): Promise<ResData<User>>;
  findOneByPhoneNumber(phoneNumber: string): Promise<ResData<User>>;
  findAll(): Promise<ResData<User[]>>;
  deleteUser(id: number): Promise<ResData<User>>;
}
