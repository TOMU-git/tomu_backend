import { Controller, Get, Inject, Param, ParseIntPipe, Query } from "@nestjs/common";
import { ILiveChatPaymentService } from "./interfaces/livechat-payment-service.interface";
import { ApiQuery, ApiTags } from "@nestjs/swagger";
import { Auth } from "src/common/decorator/auth.decorator";
import { RoleEnum } from "src/common/enums/enum";

@ApiTags("livechat-payment-history")
@Controller("livechat-payment-history")
export class LivechatPaymentHistoryController {
  constructor(
    @Inject("ILiveChatPaymentService")
    private readonly livechatPaymentHistoryService: ILiveChatPaymentService,
  ) {}
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "For limit",
  })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "For page",
  })
  @Auth(RoleEnum.ADMIN)
  @Get()
  findAll(@Query('limit') limit: number, @Query('page') page: number) {
    return this.livechatPaymentHistoryService.findAll(limit, page);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.livechatPaymentHistoryService.findOneById(id);
  }
}
