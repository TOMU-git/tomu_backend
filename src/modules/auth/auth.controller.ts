import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { IUserService } from '../user/interfaces/user.service';
import { CurrentUser } from 'src/common/decorator/CurrentUser.decorator';
import { User } from '../user/entities/user.entity';
import { AuthGuard } from '../shared/guards/auth.guard';
import { RolesGuard } from '../shared/guards/role.guard';
import { LoginAuthDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject('IUserService') private readonly userService: IUserService,
  ) {}

  // Register
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Post('register')
  register(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.userService.create(createUserDto, currentUser);
  }

  // Login
  @Post('login')
  login(@Body() loginAuthDto: LoginAuthDto) {
    console.log(loginAuthDto);
    return this.authService.login(loginAuthDto);
  }
}
