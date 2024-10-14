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
    size: number, // Faylning o'lchami
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // Vaqtinchalik fayl nomini yarating
      const tempFilePath = path.join(__dirname, 'temp_video.mp4');

      // Bufferni vaqtinchalik faylga yozing
      fs.writeFile(tempFilePath, fileBuffer, async (err) => {
        if (err) {
          return reject(err);
        }

        // Faylni yuklash
        this.vimeoClient.upload(
          tempFilePath,
          {
            name: title,
            description: description,
          },
          (uri) => {
            const videoId = uri.split('/').pop();
            const videoUrl = `https://player.vimeo.com/video/${videoId}`;
            // Vaqtinchalik faylni o'chirish
            fs.unlink(tempFilePath, (err) => {
              if (err) console.error('Error deleting temp file', err);
            });
            resolve(videoUrl);
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
}
