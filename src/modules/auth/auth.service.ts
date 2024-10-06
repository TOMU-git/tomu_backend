import { Body, Inject, Injectable } from '@nestjs/common';
import { LoginAuthDto } from './dto/auth.dto';
import { JwtService } from '@nestjs/jwt';
import { IUserResData, IUserService } from '../user/interfaces/user.service';
import { AuthException } from './exception/auth.exception';
import { matchPassword } from 'src/lib/bcrypt';
import { ResData } from 'src/lib/resData';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @Inject('IUserService') private readonly userService: IUserService,
  ) {}
  async login(@Body() loginAuthDto: LoginAuthDto) {
    const findByPhoneNumber = await this.userService._findByPhoneNumber(
      loginAuthDto.phoneNumber,
    );

    console.log(findByPhoneNumber);

    if (!findByPhoneNumber) {
      throw new AuthException();
    }

    const isMatch = await matchPassword(
      loginAuthDto.password,
      findByPhoneNumber.password,
    );

    console.log(isMatch);

    if (!isMatch) {
      throw new AuthException();
    }

    const token = this.jwtService.sign({ id: findByPhoneNumber.id });

    return new ResData<IUserResData>('success', 200, {
      user: findByPhoneNumber,
      token,
    });
  }
}
