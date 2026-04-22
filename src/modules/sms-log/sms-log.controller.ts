import { Controller, Get, Inject, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Auth } from "src/common/decorator/auth.decorator";
import { RoleEnum } from "src/common/enums/enum";
import { ISmsLogService } from "./interfaces/sms-log.service";
import { SmsLogFilterDto } from "./dto/sms-log-filter.dto";

@ApiTags("Admin - SMS Logs")
@Controller("admin/sms-logs")
export class SmsLogController {
  constructor(
    @Inject("ISmsLogService")
    private readonly smsLogService: ISmsLogService,
  ) {}

  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @ApiOperation({
    summary: "SMS loglarini ko'rish",
    description:
      "Phone raqami, status, type va sana bo'yicha filter qilib SMS loglarini ko'rish. Muammo bo'lgan raqamni qidirib, u haqida barcha ma'lumotni topish mumkin.",
  })
  @Get()
  findAll(@Query() filter: SmsLogFilterDto) {
    return this.smsLogService.findAll(filter);
  }
}
