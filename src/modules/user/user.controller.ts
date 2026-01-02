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
  ValidationPipe,
} from "@nestjs/common";

import { IUserService } from "./interfaces/user.service";
import { ApiQuery, ApiTags, ApiParam, ApiResponse } from "@nestjs/swagger";
import { SearchUserByPhoneNumber } from "./dto/create-users.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { Auth } from "src/common/decorator/auth.decorator";
import { RoleEnum } from "src/common/enums/enum";
@ApiTags("user")
@Controller("user")
export class UserController {
  constructor(
    @Inject("IUserService") private readonly userService: IUserService,
  ) { }
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

  // *** Check phone number availability (public endpoint) *** //
  @ApiParam({
    name: 'phoneNumber',
    type: String,
    example: '+998901234567',
    description: 'Phone number to check availability'
  })
  @ApiResponse({
    status: 200,
    description: 'Phone availability checked',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'phone availability checked' },
        statusCode: { type: 'number', example: 200 },
        data: { type: 'boolean', example: true, description: 'true if available, false if exists' }
      }
    }
  })
  @Get("check-phone/:phoneNumber")
  async checkPhoneAvailability(@Param("phoneNumber") phoneNumber: string) {
    return await this.userService.checkPhoneAvailability(phoneNumber);
  }

  // *** Getting user by phone number *** //
  @ApiParam({
    name: 'phoneNumber',
    type: String,
    example: '+998901234567',
    description: 'Phone number to search for user'
  })
  @ApiResponse({
    status: 200,
    description: 'User found successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'found user by phone' },
        statusCode: { type: 'number', example: 200 },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            phoneNumber: { type: 'string', example: '+998901234567' },
            gender: { type: 'string', enum: ['male', 'female'], example: 'male' },
            role: { type: 'string', enum: ['student', 'teacher', 'admin', 'director'], example: 'student' },
            courseId: { type: 'number', example: 1 },
            maxDevices: { type: 'number', example: 2 },
            deviceManagementEnabled: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User not found' },
        statusCode: { type: 'number', example: 404 }
      }
    }
  })
  @Get("phone/:phoneNumber")
  async findByPhoneNumber(@Param("phoneNumber", ValidationPipe) phoneNumber: string) {
    return await this.userService.findOneByPhoneNumber(phoneNumber);
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
