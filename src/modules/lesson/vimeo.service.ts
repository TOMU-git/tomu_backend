import { Injectable } from "@nestjs/common";
import { Vimeo } from "vimeo";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class VimeoService {
  private vimeoClient: Vimeo;

  constructor() {
    const clientId = process.env.VIMEO_CLIENT_ID;
    const clientSecret = process.env.VIMEO_CLIENT_SECRET;
    const accessToken = process.env.VIMEO_ACCESS_TOKEN;

    // console.log('🔧 VimeoService initialized with credentials:', {
    //   clientId: clientId ? `${clientId.substring(0, 8)}...` : 'NOT SET',
    //   clientSecret: clientSecret ? `${clientSecret.substring(0, 8)}...` : 'NOT SET',
    //   accessToken: accessToken ? `${accessToken.substring(0, 8)}...` : 'NOT SET',
    //   timestamp: new Date().toISOString()
    // });

    if (!clientId || !clientSecret || !accessToken) {
      console.error('❌ Vimeo credentials are missing! Please check environment variables:');
      console.error('   - VIMEO_CLIENT_ID:', clientId ? '✅ Set' : '❌ Missing');
      console.error('   - VIMEO_CLIENT_SECRET:', clientSecret ? '✅ Set' : '❌ Missing');
      console.error('   - VIMEO_ACCESS_TOKEN:', accessToken ? '✅ Set' : '❌ Missing');
    }

    this.vimeoClient = new Vimeo(clientId, clientSecret, accessToken);
  }

  async uploadVideo(
    fileBuffer: Buffer,
    title: string,
    description: string,
  ): Promise<{ videoUrl: string; duration: number }> {
    // console.log('🎬 Vimeo video upload started:', {
    //   title,
    //   description,
    //   fileSize: fileBuffer.length,
    //   timestamp: new Date().toISOString()
    // });

    return new Promise((resolve, reject) => {
      const tempFilePath = path.join(__dirname, 'temp_video.mp4');
      // console.log('📁 Creating temporary file at:', tempFilePath);

      fs.writeFile(tempFilePath, fileBuffer, async (err) => {
        if (err) {
          console.error('❌ Error writing temporary file:', err);
          return reject(err);
        }

        // console.log('✅ Temporary file created successfully, starting Vimeo upload...');

        this.vimeoClient.upload(
          tempFilePath,
          {
            name: title,
            description: description,
          },
          async (uri) => {
            // console.log('🎉 Vimeo upload completed successfully!');
            // console.log('🔗 Video URI:', uri);

            // Video ID ni to'g'ri parse qilish - Vimeo API /videos/{id} formatida qaytaradi
            let videoId: string;
            const uriMatch = uri.match(/\/videos\/(\d+)/);
            if (uriMatch && uriMatch[1]) {
              videoId = uriMatch[1];
            } else {
              // Fallback: agar regex ishlamasa, split bilan olish
              videoId = uri.split('/').pop() || uri;
            }

            if (!videoId || !/^\d+$/.test(videoId)) {
              return reject(new Error(`Invalid video URI format: ${uri}`));
            }

            const videoUrl = `https://player.vimeo.com/video/${videoId}`;

            // console.log('🆔 Video ID:', videoId);
            // console.log('🌐 Video URL:', videoUrl);

            // Delete the temporary file
            fs.unlink(tempFilePath, (err) => {
              if (err) {
                console.error("❌ Error deleting temp file:", err);
              } else {
                // console.log('🗑️ Temporary file deleted successfully');
              }
            });

            // Add a delay to get the video duration
            // console.log('⏳ Waiting for video to be processed...');
            let videoInfo: { duration: number; status: string } | null = null;
            const maxAttempts = 5;
            let attempts = maxAttempts;
            const waitInterval = 2000; // 2 soniya (5 soniyadan kamaytirildi)

            do {
              // console.log(`🔍 Attempting to get video info (${maxAttempts - attempts + 1}/${maxAttempts})...`);
              try {
                videoInfo = await this.getVideoInfo(videoId);
                // console.log('📊 Video info retrieved:', {
                //   duration: videoInfo.duration,
                //   status: videoInfo.status
                // });

                if (videoInfo && videoInfo.status === 'available') {
                  // console.log('✅ Video is available and ready!');
                  break; // If the video is available, break the loop
                } else {
                  // console.log(`⏳ Video status: ${videoInfo?.status}, waiting ${waitInterval / 1000} seconds...`);
                }
              } catch (error) {
                console.error('❌ Error getting video info:', error);
                // Error bo'lsa ham davom etadi, lekin videoInfo null qoladi
                videoInfo = null;
              }

              if (attempts > 1) {
                // Oxirgi urinishda kutmaymiz
                await new Promise((res) => setTimeout(res, waitInterval));
              }
              attempts--;
            } while (attempts > 0);

            // videoInfo undefined yoki duration yo'q bo'lsa, error throw qilish
            if (!videoInfo || typeof videoInfo.duration !== 'number') {
              const errorMessage = 'Video processing failed - duration not available after processing attempts';
              console.error(`❌ ${errorMessage} (videoId: ${videoId})`);
              return reject(new Error(errorMessage));
            }

            if (videoInfo.status !== 'available') {
              console.warn(`⚠️ Video processing timeout - video status: ${videoInfo.status} (videoId: ${videoId})`);
            }

            // console.log('🎯 Upload process completed:', {
            //   videoUrl,
            //   duration: videoInfo.duration,
            //   finalStatus: videoInfo.status
            // });

            resolve({ videoUrl, duration: videoInfo.duration });
          },
          (bytesUploaded, bytesTotal) => {
            const percentage = (bytesUploaded / bytesTotal) * 100;
            // console.log(`📤 Upload progress: ${percentage.toFixed(2)}% (${bytesUploaded}/${bytesTotal} bytes)`);
          },
          (error) => {
            console.error('❌ Vimeo upload error:', error);
            console.error('📋 Error details:', {
              errorType: typeof error,
              errorString: String(error),
              errorJSON: JSON.stringify(error, null, 2)
            });
            reject(error);
          },
        );
      });
    });
  }

  async getVideoInfo(
    videoId: string,
  ): Promise<{ duration: number; status: string }> {
    // console.log(`🔍 Getting video info for ID: ${videoId}`);

    return new Promise((resolve, reject) => {
      this.vimeoClient.request(
        {
          path: `/videos/${videoId}`,
          method: 'GET',
        },
        (error, body) => {
          if (error) {
            console.error(`❌ Error getting video info for ${videoId}:`, error);
            reject(error);
          } else {
            // console.log(`✅ Video info retrieved for ${videoId}:`, {
            //   duration: body.duration,
            //   status: body.status,
            //   name: body.name,
            //   created_time: body.created_time
            // });
            resolve({ duration: body.duration, status: body.status });
          }
        },
      );
    });
  }
}
