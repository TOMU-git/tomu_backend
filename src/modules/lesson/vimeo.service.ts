import { Injectable } from '@nestjs/common';
import { Vimeo } from 'vimeo';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class VimeoService {
  private vimeoClient: Vimeo;

  constructor() {
    const clientId = process.env.VIMEO_CLIENT_ID;
    const clientSecret = process.env.VIMEO_CLIENT_SECRET;
    const accessToken = process.env.VIMEO_ACCESS_TOKEN;

    this.vimeoClient = new Vimeo(clientId, clientSecret, accessToken);
  }

  async uploadVideo(
    fileBuffer: Buffer,
    title: string,
    description: string,
  ): Promise<{ videoUrl: string; duration: number }> {
    return new Promise((resolve, reject) => {
      const tempFilePath = path.join(__dirname, 'temp_video.mp4');

      fs.writeFile(tempFilePath, fileBuffer, async (err) => {
        if (err) {
          return reject(err);
        }

        this.vimeoClient.upload(
          tempFilePath,
          {
            name: title,
            description: description,
          },
          async (uri) => {
            const videoId = uri.split('/').pop();
            const videoUrl = `https://player.vimeo.com/video/${videoId}`;

            // Vaqtinchalik faylni o'chirish
            fs.unlink(tempFilePath, (err) => {
              if (err) console.error('Error deleting temp file', err);
            });

            // Video davomiyligini olish uchun kechikish qo'shing
            let videoInfo;
            let attempts = 5; // 5 marta urinib ko'ramiz
            do {
              videoInfo = await this.getVideoInfo(videoId);
              if (videoInfo.status === 'available') {
                break; // Video holati mavjud bo'lsa, tsiklni to'xtatamiz
              }
              await new Promise((res) => setTimeout(res, 5000)); // 5 soniya kutamiz
              attempts--;
            } while (attempts > 0);

            resolve({ videoUrl, duration: videoInfo.duration });
          },
          (bytesUploaded, bytesTotal) => {
            const percentage = (bytesUploaded / bytesTotal) * 100;
            console.log(`${percentage.toFixed(2)}% uploaded`);
          },
          (error) => {
            reject(error);
          },
        );
      });
    });
  }

  async getVideoInfo(
    videoId: string,
  ): Promise<{ duration: number; status: string }> {
    return new Promise((resolve, reject) => {
      this.vimeoClient.request(
        {
          path: `/videos/${videoId}`,
          method: 'GET',
        },
        (error, body) => {
          if (error) {
            reject(error);
          } else {
            resolve({ duration: body.duration, status: body.status }); // Status qo'shamiz
          }
        },
      );
    });
  }
}
