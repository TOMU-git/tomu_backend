import { ResData } from 'src/lib/resData';
import { LoginAuthDto } from '../dto/auth.dto';
import { User } from 'src/modules/user/entities/user.entity';
import { CreateAdminTeacherDto, CreateStudentDto } from 'src/modules/user/dto/create-users.dto';
import { Response } from 'express';

export interface IAuthService {
  login(dto: LoginAuthDto, res: Response): Promise<ResData<ILoginData>>;
  createAdmin(dto: CreateAdminTeacherDto, res: Response): Promise<ResData<ILoginData>>;
  createStudent(dto: CreateStudentDto, res: Response): Promise<ResData<ILoginData>>;
}

export interface ILoginData {
  data: User;
  tokens: ITokens;
}

interface ITokens {
  access_token: string;
  refresh_token: string;
}