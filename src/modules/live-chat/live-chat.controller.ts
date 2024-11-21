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
import { CreateLiveChatDto } from "./dto/create-live-chat.dto";
import { UpdateLiveChatDto } from "./dto/update-live-chat.dto";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { ParseDatePipe } from "src/common/pipes/date-check";
import { ILiveChatService } from "./interfaces/service-interface";

@ApiTags('live-chat')
@Controller("live-chat")
export class LiveChatController {
  constructor(@Inject("ILiveChatService") private readonly liveChatService: ILiveChatService) {}

//// *** Create live-chat form *** ////

  @ApiOperation({summary: "Create a new live-chat form"})
  @Post('create')
  async create(
    @Body() createLiveChatDto: CreateLiveChatDto
  ) {
    return await this.liveChatService.create(createLiveChatDto);
  }
  
  //// *** Get live-chat form by selected day *** ////
  
  @ApiOperation({ summary: "Get a live-chat form by selected day" })
  @ApiQuery({
      name: "day",
      type: String,
      required: true,
      description: "Date in YYYY-MM-DD format",
      example: "2024-11-25"
    })
  @ApiQuery({
      name: "courseId",
      type: Number,
      required: true,
      description: "Course id",
    })
  @Get('day')
  async getLiveChatsByDay(@Query('day') day: Date, @Query('courseId', ParseIntPipe) courseId: number) {
    return await this.liveChatService.getTimesByDay(day, courseId);
  }

//// *** Get all live-chat forms *** ////

  @ApiOperation({summary: "Get all live-chat forms"})
  @Get()
  async findAll() {
    return await this.liveChatService.findAll();
  }

  @ApiOperation({ summary: "Find all live chats by teacher id and gender" })
  @Get('teacher/:teacherId')
    async foundTeacherLiveChats(
      @Param("teacherId", ParseIntPipe) teacherId: number,
    ) {
      return await this.liveChatService.findTeacherLivechats(teacherId);
    }


//// *** Get single live-chat form by id *** ////
  @ApiOperation({summary: "Get a live-chat form by id"})
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.liveChatService.findOne(id);
  }

//// *** Update live-chat form by id *** ////  
  @ApiOperation({summary: "Update a live-chat form by id"})
  @Patch("update/:id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body('selectedDay', ParseDatePipe) selectedDay: Date,
    @Body() updateLiveChatDto: UpdateLiveChatDto,
  ) {
    return await this.liveChatService.update(id, selectedDay, updateLiveChatDto);
  }

//// *** Delete live-chat form by id *** ////

  @ApiOperation({summary: "Delete a live-chat form by id"})
  @Delete("delete/:id")
  async remove(@Param("id", ParseIntPipe) id: number) {
    return await this.liveChatService.remove(id);
  }
}
