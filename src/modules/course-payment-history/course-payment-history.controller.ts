import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Inject,
  Query,
} from "@nestjs/common";
import { CoursePaymentHistoryService } from "./course-payment-history.service";
import { RoleEnum } from "src/common/enums/enum";
import { Auth } from "src/common/decorator/auth.decorator";
import { ApiQuery, ApiTags } from "@nestjs/swagger";
import { ICoursePaymentService } from "./interfaces/course-payment-service.interface";

@ApiTags("course-payment-history")
@Controller("course-payment-history")
export class CoursePaymentHistoryController {
  constructor(
    @Inject("ICoursePaymentService")
    private readonly coursePaymentHistoryService: ICoursePaymentService,
  ) {}

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
  @Auth(RoleEnum.ADMIN)
  @Get()
  findAll(@Query('limit') limit: number, @Query('page') page: number) {
    return this.coursePaymentHistoryService.findAll(limit, page);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.coursePaymentHistoryService.findOneById(id);
  }
}
