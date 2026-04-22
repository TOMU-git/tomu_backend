import { Controller, Get, Post, Body, Patch, Param, Delete, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Auth } from 'src/common/decorator/auth.decorator';
import { RoleEnum } from 'src/common/enums/enum';
import { CurrentUser } from 'src/common/decorator/CurrentUser.decorator';
import { User as UserEntity } from '../user/entities/user.entity';
import { ILectureService } from './interfaces/lecture.service';
import { CreateLectureDto } from './dto/create-lecture.dto';
import { UpdateLectureDto } from './dto/update-lecture.dto';
import { UpdateInviteLinkDto } from './dto/update-invite-link.dto';

@ApiTags('Lectures')
@ApiBearerAuth()
@Controller('lecture')
export class LectureController {
  constructor(@Inject('ILectureService') private readonly lectureService: ILectureService) { }

  @Post()
  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @ApiOperation({ summary: 'Create a new lecture' })
  create(@Body() createLectureDto: CreateLectureDto) {
    return this.lectureService.create(createLectureDto);
  }

  @Get()
  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.TEACHER)
  @ApiOperation({ summary: 'Get all lectures' })
  findAll() {
    return this.lectureService.findAll();
  }

  @ApiOperation({ summary: 'Get upcoming lecture by user group' })
  @ApiBearerAuth()
  @Auth(RoleEnum.STUDENT, RoleEnum.TEACHER, RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Get('by-user')
  async getLectureByUser(@CurrentUser() user: UserEntity) {
    return await this.lectureService.getLectureByUserId(user.id);
  }

  @Get('report/teacher/:teacherId')
  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.TEACHER)
  @ApiOperation({ summary: 'Get completed lectures report for a teacher' })
  getTeacherReport(@Param('teacherId') teacherId: number) {
    return this.lectureService.getTeacherReport(teacherId);
  }

  @Get('report/group/:groupId')
  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.TEACHER)
  @ApiOperation({ summary: 'Get all lectures report for a group' })
  getGroupReport(@Param('groupId') groupId: number) {
    return this.lectureService.getGroupReport(groupId);
  }

  @Get(':id')
  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.TEACHER)
  @ApiOperation({ summary: 'Get a lecture by ID' })
  async findOne(@Param('id') id: string) {
    return await this.lectureService.findOne(+id);
  }

  @Patch(':id')
  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @ApiOperation({ summary: 'Update lecture' })
  update(@Param('id') id: string, @Body() updateLectureDto: UpdateLectureDto) {
    return this.lectureService.update(+id, updateLectureDto);
  }

  @Delete(':id')
  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @ApiOperation({ summary: 'Delete a lecture' })
  remove(@Param('id') id: string) {
    return this.lectureService.remove(+id);
  }

  @Post('group/:groupId/generate')
  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @ApiOperation({ summary: 'Generate all lectures for a group based on course grammars' })
  generateLectures(@Param('groupId') groupId: number) {
    return this.lectureService.createLecturesForGroup(groupId);
  }

  @Get('group/:groupId')
  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.TEACHER)
  @ApiOperation({ summary: 'Get all lectures for a specific group' })
  getLecturesByGroup(@Param('groupId') groupId: number) {
    return this.lectureService.findByGroupId(groupId);
  }

  @Patch(':id/invite-link')
  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @ApiOperation({ summary: 'Update lecture invite link and mark as completed' })
  updateInviteLink(
    @Param('id') id: number,
    @Body() dto: UpdateInviteLinkDto,
  ) {
    return this.lectureService.updateInviteLink(id, dto.inviteLink);
  }

  @Post(':id/start')
  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @ApiOperation({ summary: 'Manually start a lecture (ASSIGNED → ONGOING)' })
  startLecture(@Param('id') id: number) {
    return this.lectureService.startLecture(id);
  }

  @Post(':id/complete')
  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @ApiOperation({ summary: 'Manually complete a lecture (ONGOING → COMPLETED + cleanup)' })
  completeLecture(@Param('id') id: number) {
    return this.lectureService.completeLecture(id);
  }

  @Post(':id/cancel')
  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @ApiOperation({ summary: 'Cancel a lecture' })
  cancelLecture(@Param('id') id: number) {
    return this.lectureService.cancelLecture(id);
  }
}

