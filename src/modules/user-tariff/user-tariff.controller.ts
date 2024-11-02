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
  create(@Body() createUserTariffDto: CreateUserTariffDto) {
    return this.userTariffService.create(createUserTariffDto);
  }

  @Get()
  findAll() {
    return this.userTariffService.findAll();
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: ID) {
    return this.userTariffService.findOne(id);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: ID,
    @Body() updateUserTariffDto: UpdateUserTariffDto,
  ) {
    return this.userTariffService.update(id, updateUserTariffDto);
  }

  @Delete(":id")
  delete(@Param("id", ParseIntPipe) id: ID) {
    return this.userTariffService.delete(id);
  }
}
