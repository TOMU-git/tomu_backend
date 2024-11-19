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
} from "@nestjs/common";
import { CoursePaymentHistoryService } from "./course-payment-history.service";
import { RoleEnum } from "src/common/enums/enum";
import { Auth } from "src/common/decorator/auth.decorator";
import { ApiTags } from "@nestjs/swagger";
import { ICoursePaymentService } from "./interfaces/course-payment-service.interface";

@ApiTags("course-payment-history")
@Controller("course-payment-history")
export class CoursePaymentHistoryController {
  constructor(
    @Inject("ICoursePaymentService")
    private readonly coursePaymentHistoryService: ICoursePaymentService,
  ) {}

  @Auth(RoleEnum.ADMIN)
  @Get()
  findAll() {
    return this.coursePaymentHistoryService.findAll();
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.coursePaymentHistoryService.findOneById(id);
  }
}
