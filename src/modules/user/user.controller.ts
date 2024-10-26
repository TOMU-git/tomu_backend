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
} from "@nestjs/common";
import { UpdateUserDto } from "./dto/update-user.dto";
import { ApiTags } from "@nestjs/swagger";
import { IUserService } from "./interfaces/user.service";
import { RoleEnum } from "src/common/enums/enum";
import { Auth } from "src/common/decorator/auth.decorator";
import { SearchUserByPhoneNumber } from "./dto/create-users.dto";

@ApiTags("user")
@Controller("user")
export class UserController {
  constructor(
    @Inject("IUserService") private readonly userService: IUserService,
  ) {}
  // *** Getting all available users *** //
  // @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN)
  @Get()
  async findAll() {
    return await this.userService.findAll();
  }

  @Post("/phone-number")
  async findUsersByPhoneNumber(@Body() data: SearchUserByPhoneNumber) {
    return await this.userService.findOneByPhoneNumber(data.phoneNumber);
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
