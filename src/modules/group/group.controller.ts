import { Controller, Get, Post, Body, Patch, Param, Delete, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IGroupService } from './interfaces/group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AddStudentToGroupDto } from './dto/add-student-to-group.dto';

@ApiTags('Groups')
@Controller('group')
export class GroupController {
  constructor(@Inject("IGroupService") private readonly groupService: IGroupService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new group' })
  create(@Body() createGroupDto: CreateGroupDto) {
    return this.groupService.create(createGroupDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all groups' })
  findAll() {
    return this.groupService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a group by ID' })
  findOne(@Param('id') id: string) {
    return this.groupService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a group' })
  update(@Param('id') id: string, @Body() updateGroupDto: UpdateGroupDto) {
    return this.groupService.update(+id, updateGroupDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a group' })
  remove(@Param('id') id: string) {
    return this.groupService.remove(+id);
  }

  @Post('add-student')
  @ApiOperation({ summary: 'Add student to available group or create new group' })
  addStudent(@Body() dto: AddStudentToGroupDto) {
    return this.groupService.addStudentToGroup(dto.userId, dto.courseId);
  }

  @Post('start-ready-groups')
  @ApiOperation({ summary: 'Start groups that are ready (filled 3 days ago)' })
  startReadyGroups() {
    return this.groupService.startGroupsIfReady();
  }
  @Get(':id/telegram-members')
  @ApiOperation({ summary: 'Get telegram members of a group' })
  getTelegramMembers(@Param('id') id: string) {
    return this.groupService.getTelegramMembers(+id);
  }
}
