import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Inject,
  Res,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAdminTeacherDto, CreateStudentDto } from '../user/dto/create-users.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { PhoneNumberAlreadyExist } from './exception/auth.exception';
import { CookieGetter } from 'src/common/decorator/cookiGetter';
import { AccessAuthDto, LoginAuthDto } from './dto/auth.dto';
import { IUserService } from '../user/interfaces/user.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject('IUserService') private readonly userService: IUserService,
  ) {}
  // **** Login for all users **** //

  @ApiOperation({ summary: "Log In user or admin by phone number and password" })
  @Post('sign-in')
  async login(@Body() loginDto: LoginAuthDto, @Res() res: Response) {
    const found = await this.authService.login(loginDto, res);
    res.send(found)
  }

  // **** Access validation **** //

  @Post('current')
  async access(@Body() accessDto: AccessAuthDto){
    return await this.authService.access(accessDto)
  }
  
  // **** Regenerate the refresh token **** //

  @Get('refresh/:id')
  async refresh(
    @Param('id', ParseIntPipe) id: number,
    @CookieGetter("refresh_token") refreshToken: string,
    @Res() res: Response,
  ) {
    const refreshed = await this.authService.refreshToken(id, refreshToken, res);
    res.send(refreshed);
  }

  // **** Register for students **** //

  @Post('register/students')
  async registerStudent(@Body() studentCreateDto: CreateStudentDto, @Res() res: Response) {
    const { data: foundUser } = await this.userService.findOneByPhoneNumber(
      studentCreateDto.phoneNumber
    );

    if (foundUser) {
      throw new PhoneNumberAlreadyExist();
    }
    const createdUser = await this.authService.createStudent(studentCreateDto, res);
    res.send(createdUser);
  }
  
    // **** Register for admins and teachers **** //

  @Post('register/admin')
  async registerAdmin(@Body() adminCreateDto: CreateAdminTeacherDto, @Res() res: Response){
    const { data: foundUser } = await this.userService.findOneByPhoneNumber(
      adminCreateDto.phoneNumber
    );

    if (foundUser) {
      throw new PhoneNumberAlreadyExist();
    }
    const createdUser = await this.authService.createStudent(adminCreateDto, res);
    res.send(createdUser);
  }
  }



