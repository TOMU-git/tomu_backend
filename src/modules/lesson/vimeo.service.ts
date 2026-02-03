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
  ): Promise<{ videoUrl: string; duration: number; vimeoVideoId: string }> {
    console.log('🎬 Vimeo video upload started:', {
      title,
      description,
      fileSize: fileBuffer.length,
      timestamp: new Date().toISOString()
    });

    return new Promise((resolve, reject) => {
      const tempFilePath = path.join(__dirname, 'temp_video.mp4');
      console.log('📁 Creating temporary file at:', tempFilePath);

      fs.writeFile(tempFilePath, fileBuffer, async (err) => {
        if (err) {
          console.error('❌ Error writing temporary file:', err);
          return reject(err);
        }

        console.log('✅ Temporary file created successfully, starting Vimeo upload...');

        this.vimeoClient.upload(
          tempFilePath,
          {
            name: title,
            description: description,
          },
          async (uri) => {
            console.log('🎉 Vimeo upload completed successfully!');
            console.log('🔗 Video URI:', uri);

            const videoId = uri.split('/').pop();
            const videoUrl = `https://player.vimeo.com/video/${videoId}`;

            console.log('🆔 Video ID:', videoId);
            console.log('🌐 Video URL:', videoUrl);

            // Delete the temporary file
            fs.unlink(tempFilePath, (err) => {
              if (err) {
                console.error("❌ Error deleting temp file:", err);
              } else {
                console.log('🗑️ Temporary file deleted successfully');
              }
            });

            // Add a delay to get the video duration
            console.log('⏳ Waiting for video to be processed...');
            let videoInfo;
            let attempts = 10; // Try up to 10 times (increased from 5)
            do {
              console.log(`🔍 Attempting to get video info (${11 - attempts}/10)...`);
              try {
                videoInfo = await this.getVideoInfo(videoId);
                console.log('📊 Video info retrieved:', {
                  duration: videoInfo?.duration,
                  status: videoInfo?.status
                });

                if (videoInfo && videoInfo.status === 'available' && videoInfo.duration > 0) {
                  console.log('✅ Video is available and ready with duration!');
                  break; // If the video is available and has duration, break the loop
                } else {
                  console.log(`⏳ Video status: ${videoInfo?.status}, duration: ${videoInfo?.duration}, waiting 3 seconds...`);
                }
              } catch (error) {
                console.error('❌ Error getting video info:', error);
              }

              await new Promise((res) => setTimeout(res, 3000)); // Wait for 3 seconds (reduced from 5)
              attempts--;
            } while (attempts > 0);

            if (attempts === 0) {
              console.warn('⚠️ Video processing timeout - using available info');
            }

            // Agar duration 0 yoki undefined bo'lsa, default qiymat berish
            const finalDuration = videoInfo?.duration && videoInfo.duration > 0 ? videoInfo.duration : 1;

            console.log('🎯 Upload process completed:', {
              videoUrl,
              duration: finalDuration,
              originalDuration: videoInfo?.duration,
              finalStatus: videoInfo?.status,
              wasDefaultUsed: finalDuration === 1
            });

            resolve({
              videoUrl,
              duration: finalDuration,
              vimeoVideoId: videoId,
            });
          },
          (bytesUploaded, bytesTotal) => {
            const percentage = (bytesUploaded / bytesTotal) * 100;
            console.log(`📤 Upload progress: ${percentage.toFixed(2)}% (${bytesUploaded}/${bytesTotal} bytes)`);
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
    console.log(`🔍 Getting video info for ID: ${videoId}`);

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
            console.log(`✅ Video info retrieved for ${videoId}:`, {
              duration: body.duration,
              status: body.status,
              name: body.name,
              created_time: body.created_time
            });
            resolve({ duration: body.duration, status: body.status });
          }
        },
      );
    });
  }

  async getPlaybackUrl(videoId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.vimeoClient.request(
        {
          path: `/videos/${videoId}`,
          method: "GET",
        },
        (error, body) => {
          if (error) {
            return reject(error);
          }

          /**
           * play.hls yoki play.progressive dan foydalanamiz
           * play — expiring (24 soat), custom player uchun TO'G'RI variant
           */
          if (body.play?.hls?.link) {
            return resolve(body.play.hls.link);
          }

          if (body.play?.progressive?.length > 0) {
            // eng sifatlisini olamiz
            const sorted = body.play.progressive.sort(
              (a, b) => b.height - a.height,
            );
            return resolve(sorted[0].link);
          }

          reject(new Error("Playback URL not found"));
        },
      );
    });
  }

}
