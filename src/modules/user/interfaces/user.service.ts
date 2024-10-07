import { ResData } from 'src/lib/resData';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../entities/user.entity';

export interface IUserResData {
  user: User;
  token: string;
}

export interface IUserService {
  create(
    createUserDto: CreateUserDto,
    currentUser: User,
  ): Promise<ResData<IUserResData>>;

  findAll(): Promise<ResData<User[]>>;

  findOne(id: number): Promise<ResData<User>>;

  _findByPhoneNumber(phoneNumber: string): Promise<User>;

  update(
    id: number,
    updateUserDto: UpdateUserDto,
    currentUser: User,
  ): Promise<ResData<User>>;

  delete(id: number, currentUser: User): Promise<ResData<User>>;
}
