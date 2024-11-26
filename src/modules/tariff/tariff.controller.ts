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
import { UpdateTariffDto } from "./dto/update-tariff.dto";
import { ApiTags } from "@nestjs/swagger";
import { ITariffService } from "./interface/tariff.service";
import { RoleEnum } from "src/common/enums/enum";
import { CreateTariffDto } from "./dto/create-tariff.dto";
import { Auth } from "src/common/decorator/auth.decorator";

@ApiTags("tariff")
@Controller("tariff")
export class TariffController {
  constructor(
    @Inject("ITariffService") private readonly tariffService: ITariffService,
  ) {}

  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Post()
  create(@Body() createTariffDto: CreateTariffDto) {
    return this.tariffService.create(createTariffDto);
  }

  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Get()
  findAll() {
    return this.tariffService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.tariffService.findOne(+id);
  }

  @Get("course/:courseId")
  findByCourseId(@Param("courseId") courseId: string) {
    return this.tariffService.findByCourseId(+courseId);
  }

  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Patch(":id")
  update(@Param("id") id: string, @Body() updateTariffDto: UpdateTariffDto) {
    return this.tariffService.update(+id, updateTariffDto);
  }

  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.tariffService.delete(+id);
  }
}
