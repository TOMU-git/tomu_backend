import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Inject,
} from "@nestjs/common";
import { CreateUserTariffDto } from "./dto/create-user-tariff.dto";
import { UpdateUserTariffDto } from "./dto/update-user-tariff.dto";
import { IUserTariffService } from "./interfaces/user-tariff.service";
import { ApiTags } from "@nestjs/swagger";

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
  findOne(@Param("id") id: string) {
    return this.userTariffService.findOne(+id);
  }

  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.userTariffService.delete(+id);
  }
}
