// backend/src/services/r2Service.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner'; // Optional - install if needed
import fs from 'fs';
import path from 'path';

// Initialize R2 client (using S3-compatible API)
const r2Client = new S3Client({
  region: 'auto', // R2 uses 'auto' region
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
  },
});

export interface UploadResult {
  key: string;
  url: string;
  publicUrl: string;
  size: number;
}

export class R2Service {
  private static bucketName = process.env.CLOUDFLARE_BUCKET_NAME!;
  
  /**
   * Upload video file to R2
   */
  static async uploadVideo(
    sessionId: string,
    questionId: string,
    fileName: string,
    filePath: string,
    mimeType: string = 'video/webm'
  ): Promise<UploadResult> {
    try {
      console.log('🚀 Starting R2 upload:', { sessionId, questionId, fileName });
      
      // Create structured key for organization
      const key = `videos/${sessionId}/${questionId}/${fileName}`;
      
      // Read file for upload
      const fileStream = fs.createReadStream(filePath);
      const stats = fs.statSync(filePath);
      
      console.log(`📁 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      
      // Upload to R2 using multipart upload for large files
      const upload = new Upload({
        client: r2Client,
        params: {
          Bucket: this.bucketName,
          Key: key,
          Body: fileStream,
          ContentType: mimeType,
          // Add metadata for better organization
          Metadata: {
            sessionId,
            questionId,
            originalName: fileName,
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      // Execute upload with progress tracking
      upload.on('httpUploadProgress', (progress) => {
        if (progress.total) {
          const percentage = Math.round((progress.loaded! / progress.total) * 100);
          console.log(`📤 Upload progress: ${percentage}%`);
        }
      });

      const result = await upload.done();
      console.log('✅ R2 upload completed:', result.Location);

      // Generate public URL for CDN access
      // Try different URL format that might work better with firewalls
      const publicUrl = `https://pub-10970cca8153420985c0ac257c234691.r2.dev/${key}`;
      
      return {
        key,
        url: result.Location!,
        publicUrl,
        size: stats.size,
      };
      
    } catch (error) {
      console.error('❌ R2 upload failed:', error);
      throw new Error(`Failed to upload video to R2: ${error.message}`);
    }
  }

  /**
   * Upload video from buffer (for direct upload without temp files)
   */
  static async uploadVideoFromBuffer(
    sessionId: string,
    questionId: string,
    fileName: string,
    buffer: Buffer,
    mimeType: string = 'video/webm'
  ): Promise<UploadResult> {
    try {
      console.log('🚀 Starting R2 buffer upload:', { sessionId, questionId, fileName });
      
      const key = `videos/${sessionId}/${questionId}/${fileName}`;
      
      console.log(`📁 Buffer size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
      
      const upload = new Upload({
        client: r2Client,
        params: {
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
          Metadata: {
            sessionId,
            questionId,
            originalName: fileName,
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      const result = await upload.done();
      console.log('✅ R2 buffer upload completed:', result.Location);

      const publicUrl = `https://pub-10970cca8153420985c0ac257c234691.r2.dev/${key}`;
      
      return {
        key,
        url: result.Location!,
        publicUrl,
        size: buffer.length,
      };
      
    } catch (error) {
      console.error('❌ R2 buffer upload failed:', error);
      throw new Error(`Failed to upload video buffer to R2: ${error.message}`);
    }
  }

  /**
   * Generate signed URL for secure access (if needed)
   * Note: Install @aws-sdk/s3-request-presigner if you need this
   */
  static async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    // Uncomment this if you install @aws-sdk/s3-request-presigner
    /*
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(r2Client, command, { expiresIn });
      return signedUrl;
      
    } catch (error) {
      console.error('❌ Failed to generate signed URL:', error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
    */
    
    // For now, just return the public URL
    console.log('⚠️ Using public URL instead of signed URL');
    return this.getPublicUrl(key);
  }

  /**
   * Delete video from R2
   */
  static async deleteVideo(key: string): Promise<void> {
    try {
      console.log('🗑️ Deleting video from R2:', key);
      
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await r2Client.send(command);
      console.log('✅ Video deleted from R2:', key);
      
    } catch (error) {
      console.error('❌ R2 delete failed:', error);
      throw new Error(`Failed to delete video from R2: ${error.message}`);
    }
  }

  /**
   * Get public streaming URL for a video
   */
  static getPublicUrl(key: string): string {
    return `https://pub-10970cca8153420985c0ac257c234691.r2.dev/${key}`;;
  }

  /**
   * Test R2 connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing R2 connection...');
      
      // Try to list objects (just to test connection)
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: 'test-connection', // This file doesn't need to exist
      });

      try {
        await r2Client.send(command);
      } catch (error) {
        // We expect this to fail (file doesn't exist), but it confirms connection works
        if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
          console.log('✅ R2 connection successful!');
          return true;
        }
        throw error;
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ R2 connection failed:', error);
      return false;
    }
  }

  /**
   * Generate video key from session and question info
   */
  static generateVideoKey(sessionId: string, questionId: string, fileName: string): string {
    return `videos/${sessionId}/${questionId}/${fileName}`;
  }
}