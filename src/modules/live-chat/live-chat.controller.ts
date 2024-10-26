import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { LiveChatService } from "./live-chat.service";
import { CreateLiveChatDto } from "./dto/create-live-chat.dto";
import { UpdateLiveChatDto } from "./dto/update-live-chat.dto";

@Controller("live-chat")
export class LiveChatController {
  constructor(private readonly liveChatService: LiveChatService) {}

  @Post()
  create(@Body() createLiveChatDto: CreateLiveChatDto) {
    return this.liveChatService.create(createLiveChatDto);
  }

  @Get()
  findAll() {
    return this.liveChatService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.liveChatService.findOne(+id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateLiveChatDto: UpdateLiveChatDto,
  ) {
    return this.liveChatService.update(+id, updateLiveChatDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.liveChatService.remove(+id);
  }
}
