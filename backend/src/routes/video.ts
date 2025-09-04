// backend/src/routes/video.ts (UPDATED VERSION)
import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { R2Service } from '../services/r2Service';
import { VideoModel } from '../models/Video';
import { SpeechToTextService } from '../services/speechToTextService';
import { TempFileManager } from '../utils/tempFileCleanup';

const router = express.Router();

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomId = uuidv4().substring(0, 8);
    const extension = path.extname(file.originalname) || '.webm';
    const fileName = `video_${timestamp}_${randomId}${extension}`;
    cb(null, fileName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
});

// Upload video response to R2
router.post('/upload', upload.single('video'), async (req: any, res: any) => {
  try {
    console.log('=== NEW R2 VIDEO UPLOAD ===');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const { sessionId, questionId } = req.body;
    console.log('Upload request:', { sessionId, questionId, fileName: req.file.filename });

    if (!sessionId || !questionId) {
      return res.status(400).json({ error: 'Session ID and Question ID are required' });
    }

    const localFilePath = req.file.path;
    console.log('Local file path:', localFilePath);

    try {
      // 🚀 Upload directly to R2 (no Snowflake compression!)
      const uploadResult = await R2Service.uploadVideo(
        sessionId,
        questionId,
        req.file.filename,
        localFilePath,
        req.file.mimetype
      );

      console.log('✅ R2 upload successful:', uploadResult);

      // 💾 Save video metadata to database with R2 info
      const videoId = uuidv4();
      const videoRecord = await VideoModel.saveVideoResponse({
        id: videoId,
        session_id: sessionId,
        question_id: questionId,
        file_name: req.file.filename,
        r2_key: uploadResult.key,
        r2_url: uploadResult.publicUrl,
        file_size_bytes: req.file.size,
        mime_type: req.file.mimetype,
        upload_status: 'completed'
      });

      console.log('✅ Video metadata saved to database');

      // 🎤 Process transcription (read file before cleanup)
      let fileBuffer: Buffer | null = null;
      try {
        fileBuffer = fs.readFileSync(localFilePath);
        console.log(`📖 File read into memory: ${fileBuffer.length} bytes`);
      } catch (readError) {
        console.error('Failed to read file for transcription:', readError);
      }

      // 🧹 Clean up local temp file immediately
      await TempFileManager.forceDeleteFile(localFilePath);
      console.log('🗑️ Local temp file cleaned up');

      // 🎙️ Start background transcription
      if (fileBuffer) {
        SpeechToTextService.processVideoForTranscriptionFromBuffer(
          videoId,
          sessionId,
          questionId,
          fileBuffer,
          req.file.mimetype || 'video/webm'
        ).catch(error => {
          console.error('Background transcription failed:', error);
        });
      }

      // 🎉 Success response
      res.json({
        message: 'Video uploaded successfully to R2',
        videoId,
        fileName: req.file.filename,
        size: req.file.size,
        streamingUrl: uploadResult.publicUrl, // ✨ Direct streaming URL!
        r2Key: uploadResult.key,
        transcriptionStatus: 'processing'
      });

    } catch (uploadError) {
      console.error('❌ R2 upload failed:', uploadError);
      
      // Clean up local file on error
      await TempFileManager.forceDeleteFile(localFilePath);
      
      res.status(500).json({ 
        error: 'Failed to upload video to R2',
        details: uploadError.message 
      });
    }

  } catch (error) {
    console.error('❌ Video upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Get video info (updated for R2)
router.get('/session/:sessionId/question/:questionId', async (req: any, res: any) => {
  try {
    const { sessionId, questionId } = req.params;
    
    const video = await VideoModel.getBySessionAndQuestion(sessionId, questionId);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({
      id: video.id,
      sessionId: video.session_id,
      questionId: video.question_id,
      fileName: video.file_name,
      streamingUrl: video.r2_url,    // ✨ Direct streaming URL
      r2Key: video.r2_key,
      fileSize: video.file_size_bytes,
      mimeType: video.mime_type,
      uploadStatus: video.upload_status,
      createdAt: video.created_at
    });

  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEW: Direct streaming route (simple redirect to R2)
router.get('/stream/:sessionId/:questionId/:fileName', async (req: any, res: any) => {
  try {
    const { sessionId, questionId } = req.params;
    
    const video = await VideoModel.getBySessionAndQuestion(sessionId, questionId);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Simple redirect to R2 public URL for streaming
    console.log('🎬 Redirecting to R2 streaming URL:', video.r2_url);
    res.redirect(video.r2_url);

  } catch (error) {
    console.error('❌ Video streaming error:', error);
    res.status(500).json({ error: 'Streaming failed' });
  }
});

// DEPRECATED: Keep old download route for backward compatibility
router.get('/download/:sessionId/:questionId/:fileName', async (req: any, res: any) => {
  try {
    const { sessionId, questionId } = req.params;
    
    const video = await VideoModel.getBySessionAndQuestion(sessionId, questionId);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // If it's an R2 video, redirect to streaming
    if (video.r2_url) {
      console.log('🔄 Redirecting old download to R2 streaming');
      return res.redirect(video.r2_url);
    }

    // If it's an old Snowflake video, use the old complex download logic
    // (Keep your existing download logic here for backward compatibility)
    res.status(501).json({ error: 'Old Snowflake downloads not implemented in R2 version' });

  } catch (error) {
    console.error('❌ Video download error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

// Test R2 connection
router.get('/test-r2', async (req: any, res: any) => {
  try {
    const isConnected = await R2Service.testConnection();
    
    res.json({
      r2Connected: isConnected,
      message: isConnected ? 'R2 connection successful!' : 'R2 connection failed',
      bucketName: process.env.CLOUDFLARE_BUCKET_NAME,
    });
  } catch (error) {
    console.error('R2 test error:', error);
    res.status(500).json({ error: 'R2 test failed' });
  }
});

export default router;