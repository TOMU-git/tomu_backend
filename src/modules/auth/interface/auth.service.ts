import { ResData } from 'src/lib/resData';
import {
  LoginAuthDto,
  UpdatePasswordDto,
  UpdateProfileDto,
} from '../dto/auth.dto';
import { IUserResData } from 'src/modules/user/interfaces/user.service';
import { User } from 'src/modules/user/entities/user.entity';

export interface IAuthService {
  login(loginAuthDto: LoginAuthDto): Promise<ResData<IUserResData>>;

  profile(currentUser: User): Promise<ResData<User>>;

  updateProfile(
    updateProfileDto: UpdateProfileDto,
    currentUser: User,
  ): Promise<ResData<User>>;

  updatePassword(
    updatePasswordDto: UpdatePasswordDto,
    currentUser: User,
  ): Promise<ResData<User>>;
}
