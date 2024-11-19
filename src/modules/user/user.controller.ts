import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  Inject,
  ParseIntPipe,
  Post,
  Query,
} from "@nestjs/common";

import { IUserService } from "./interfaces/user.service";
import { ApiQuery, ApiTags } from "@nestjs/swagger";
import { SearchUserByPhoneNumber } from "./dto/create-users.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { Auth } from "src/common/decorator/auth.decorator";
import { RoleEnum } from "src/common/enums/enum";
@ApiTags("user")
@Controller("user")
export class UserController {
  constructor(
    @Inject("IUserService") private readonly userService: IUserService,
  ) {}
  // *** Getting all available users *** //
  // @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN)
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'For search'
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'For limit'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'For page'
  })
  @ApiQuery({
    name: 'role',
    required: false,
    type: String,
    description: 'For role'
  })
  @Get()
  async findAll(@Query('search') search: string, @Query('limit') limit: number, @Query('page') page: number, @Query('role') role: string) {
    return await this.userService.findAll(search, limit, page, role);
  }

  // *** Getting user by id *** //
  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: number) {
    return await this.userService.findOneById(id);
  }

  // Update user by id *** //
  @Patch("/update/:id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.updateUser(id, updateUserDto);
  }

  // *** Delete user by id *** //
  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Delete("/delete/:id")
  async delete(@Param("id", ParseIntPipe) id: number) {
    return await this.userService.deleteUser(id);
  }
}
