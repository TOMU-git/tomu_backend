import {
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Query,
} from "@nestjs/common";
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
    name: "year",
    required: false,
    type: String,
    description: "It should be current year",
  })
  @Get()
  async findAll(@Query("year") year: string) {
    const from = `${Number(year)}-01-01`;
    const to = `${Number(year)}-12-31`;
    const dateFrom = new Date(from);
    const dateTo = new Date(to);
    const timestampFrom = dateFrom.getTime();
    const timestampTo = dateTo.getTime();
    const currentYear = new Date().getFullYear().toString();
    if (year !== currentYear) {
      return [];
    } else {
      return await this.analyticsService.findAll(
        timestampFrom,
        timestampTo,
        Number(year),
      );
    }
  }

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
  @Get("course/:id")
  findOne(
    @Param("id", ParseIntPipe) id: number,
    @Query("from") from: Date,
    @Query("to") to: Date,
  ) {
    const dateFrom = new Date(`${from}T00:00:00Z`);
    dateFrom.setUTCHours(0, 1, 0, 0);
    const dateTo = new Date(`${to}T00:00:00Z`);
    dateTo.setUTCHours(23, 59, 0, 0);
    const timestampFrom = dateFrom.getTime();
    // console.log(timestampFrom);
    const timestampTo = dateTo.getTime();
    // console.log(timestampTo);
    return this.analyticsService.findOne(timestampFrom, timestampTo, id);
  }
}
