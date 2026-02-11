import { Controller, Get, Post, Body, Patch, Param, Delete, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ILectureService } from './interfaces/lecture.service';
import { CreateLectureDto } from './dto/create-lecture.dto';
import { UpdateLectureDto } from './dto/update-lecture.dto';
import { UpdateInviteLinkDto } from './dto/update-invite-link.dto';

@ApiTags('Lectures')
@Controller('lecture')
export class LectureController {
  constructor(@Inject('ILectureService') private readonly lectureService: ILectureService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new lecture' })
  create(@Body() createLectureDto: CreateLectureDto) {
    return this.lectureService.create(createLectureDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all lectures' })
  findAll() {
    return this.lectureService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a lecture by ID' })
  findOne(@Param('id') id: string) {
    return this.lectureService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a lecture' })
  update(@Param('id') id: string, @Body() updateLectureDto: UpdateLectureDto) {
    return this.lectureService.update(+id, updateLectureDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a lecture' })
  remove(@Param('id') id: string) {
    return this.lectureService.remove(+id);
  }

  @Post('group/:groupId/generate')
  @ApiOperation({ summary: 'Generate all lectures for a group based on course grammars' })
  generateLectures(@Param('groupId') groupId: number) {
    return this.lectureService.createLecturesForGroup(groupId);
  }

  @Get('group/:groupId')
  @ApiOperation({ summary: 'Get all lectures for a specific group' })
  getLecturesByGroup(@Param('groupId') groupId: number) {
    return this.lectureService.findByGroupId(groupId);
  }

  @Patch(':id/invite-link')
  @ApiOperation({ summary: 'Update lecture invite link and mark as completed' })
  updateInviteLink(
    @Param('id') id: number,
    @Body() dto: UpdateInviteLinkDto,
  ) {
    return this.lectureService.updateInviteLink(id, dto.inviteLink);
  }
}
