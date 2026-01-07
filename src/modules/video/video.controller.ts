import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiQuery, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VideoService } from './video.service';

@ApiTags('video') // Swagger’da bo‘lim nomi
@Controller('video')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Get('urls')
  @ApiOperation({ summary: 'Get video playback URLs from Vimeo ID' })
  @ApiQuery({ name: 'vimeoId', required: true, type: String, description: 'Vimeo video ID' })
  @ApiResponse({ status: 200, description: 'Video URLs returned successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid Vimeo ID' })
  async getVideoUrls(@Query('vimeoId') vimeoId: string) {
    return this.videoService.getVideoUrls(vimeoId);
  }
}
