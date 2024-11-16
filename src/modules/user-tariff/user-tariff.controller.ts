import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Inject,
  ParseIntPipe,
} from "@nestjs/common";
import { CreateUserTariffDto } from "./dto/create-user-tariff.dto";
import { UpdateUserTariffDto } from "./dto/update-user-tariff.dto";
import { IUserTariffService } from "./interfaces/user-tariff.service";
import { ApiTags } from "@nestjs/swagger";
import { ID } from "src/common/types/type";

@ApiTags("user-tariff")
@Controller("user-tariff")
export class UserTariffController {
  constructor(
    @Inject("IUserTariffService")
    private readonly userTariffService: IUserTariffService,
  ) {}

  @Post()
  async create(@Body() createUserTariffDto: CreateUserTariffDto) {
    return await this.userTariffService.create(createUserTariffDto);
  }

  @Get()
  async findAll() {
    return await this.userTariffService.findAll();
  }

  @Get("/user/:userId")
  async findByUserId(@Param("userId", ParseIntPipe) userId: number) {
    return await this.userTariffService.findAllByUserId(userId);
  }

  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: ID) {
    return await this.userTariffService.findOne(id);
  }

  @Patch("update/:id")
  async update(
    @Param("id", ParseIntPipe) id: ID,
    @Body() updateUserTariffDto: UpdateUserTariffDto,
  ) {
    return await this.userTariffService.update(id, updateUserTariffDto);
  }

  @Delete("delete/:id")
  async delete(@Param("id", ParseIntPipe) id: ID) {
    return await this.userTariffService.remove(id);
  }
}
