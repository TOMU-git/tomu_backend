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
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IUserService } from './interfaces/user.service';
import { CurrentUser } from 'src/common/decorator/CurrentUser.decorator';
import { User } from './entities/user.entity';
import { AuthGuard } from '../shared/guards/auth.guard';
import { RolesGuard } from '../shared/guards/role.guard';
import { Roles } from '../auth/decorator/role.decorator';
import { RoleEnum } from 'src/common/enums/enum';

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(
    @Inject('IUserService') private readonly userService: IUserService,
  ) {}

  // READ
  // @ApiBearerAuth()
  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(RoleEnum.DIRECTOR, RoleEnum.ADMIN)
  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.DIRECTOR, RoleEnum.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  // UPDATE
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.DIRECTOR, RoleEnum.ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.userService.update(+id, updateUserDto, currentUser);
  }

  // DELETE
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.DIRECTOR, RoleEnum.ADMIN)
  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.userService.delete(+id, currentUser);
  }
}
