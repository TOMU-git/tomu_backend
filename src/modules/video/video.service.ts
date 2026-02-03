// src/modules/video/video.service.ts
import { Injectable } from '@nestjs/common';
import fetch from 'node-fetch';

@Injectable()
export class VideoService {
  private vimeoAccessToken = process.env.VIMEO_ACCESS_TOKEN;

  async getVideoUrls(vimeoVideoId: string) {
    console.log('getVideoUrls called with', vimeoVideoId);

    if (!vimeoVideoId) {
      return {
        message: 'Vimeo video ID is required',
        statusCode: 400,
        data: null,
      };
    }

    try {
      const res = await fetch(
        `https://api.vimeo.com/videos/${vimeoVideoId}`,
        {
          headers: {
            Authorization: `Bearer ${this.vimeoAccessToken}`,
          },
        },
      );

      if (!res.ok) {
        console.error('Vimeo API error:', res.status);
        return {
          message: `Failed to fetch Vimeo video: ${res.status}`,
          statusCode: res.status,
          data: null,
        };
      }

      const video = await res.json();

      console.log('Vimeo API response received');

      // 1️⃣ HLS (ASOSIY)
      const hls = video.play?.hls
        ? {
            type: 'hls',
            url: video.play.hls.link,
            expiresAt: video.play.hls.link_expiration_time,
          }
        : null;

      // 2️⃣ MP4 fallback (eng yuqori sifat)
      let mp4 = null;
      if (video.play?.progressive?.length) {
        const best = video.play.progressive.sort(
          (a, b) => b.height - a.height,
        )[0];

        mp4 = {
          type: 'mp4',
          quality: best.quality,
          width: best.width,
          height: best.height,
          url: best.link,
        };
      }

      return {
        message: 'ok',
        statusCode: 200,
        data: {
          duration: video.duration,
          width: video.width,
          height: video.height,
          hls,
          mp4,
        },
      };
    } catch (error) {
      console.error('Vimeo fetch failed:', error);
      return {
        message: 'Vimeo fetch failed',
        statusCode: 500,
        data: null,
      };
    }
  }
}
