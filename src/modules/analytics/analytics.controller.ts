import { Controller, Get, Inject, Param } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Auth } from 'src/common/decorator/auth.decorator';
import { ApiOperation } from '@nestjs/swagger';
import { RoleEnum } from 'src/common/enums/enum';

@Controller('analytics')
export class AnalyticsController {
  constructor(@Inject("IAnalyticsService") private readonly analyticsService: AnalyticsService) {}

  @ApiOperation({ summary: 'All profits from live chat and courses' })
  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Get()
  findAll() {
    return this.analyticsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.analyticsService.findOne(+id);
  }
}
