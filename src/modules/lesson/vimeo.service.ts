import { Injectable } from '@nestjs/common';
import { Vimeo } from 'vimeo';

@Injectable()
export class VimeoService {
  private vimeoClient: Vimeo;

  constructor() {
    const clientId = process.env.VIMEO_CLIENT_ID;
    const clientSecret = process.env.VIMEO_CLIENT_SECRET;
    const accessToken = process.env.VIMEO_ACCESS_TOKEN;

    this.vimeoClient = new Vimeo(clientId, clientSecret, accessToken);
  }

  async uploadVideo(filePath: string, title: string, description: string) {
    return new Promise((resolve, reject) => {
      this.vimeoClient.upload(
        filePath,
        {
          name: title,
          description: description,
        },
        (uri) => {
          resolve(uri);
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
  }
}
