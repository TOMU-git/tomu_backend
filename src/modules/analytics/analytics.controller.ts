import { Controller, Get, Inject, Param, Query } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { Auth } from "src/common/decorator/auth.decorator";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { RoleEnum } from "src/common/enums/enum";

@ApiTags("analytics")
@Controller("analytics")
export class AnalyticsController {
  constructor(
    @Inject("IAnalyticsService")
    private readonly analyticsService: AnalyticsService,
  ) {}

  @ApiOperation({ summary: "All profits from live chat and courses" })
  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @ApiQuery({
    name: "from",
    required: false,
    type: String,
    description: "Starting date, should be like this format 'YYYY-MM-DD",
  })
  @ApiQuery({
    name: "to",
    required: false,
    type: String,
    description: "Ending date, should be like this format YYYY-MM-DD",
  })
  @Get()
  async findAll(@Query("from") from: Date, @Query("to") to: Date) {
    const dateFrom = new Date(from);
    const dateTo = new Date(to);
    const timestampFrom = dateFrom.getTime(); 
    const timestampTo = dateTo.getTime();
    return await this.analyticsService.findAll(timestampFrom, timestampTo);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.analyticsService.findOne(+id);
  }
}
