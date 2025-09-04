// backend/src/routes/video.ts
import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { executeQuery } from '../config/snowflake';
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
    // Accept video files
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
});

// Upload video response
router.post('/upload', upload.single('video'), async (req: any, res: any) => {
  try {
    console.log('Video upload request received');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const { sessionId, questionId } = req.body;
    console.log('Upload details:', { sessionId, questionId, fileName: req.file.filename });

    if (!sessionId || !questionId) {
      return res.status(400).json({ error: 'Session ID and Question ID are required' });
    }

    // Generate unique file name for Snowflake stage
    const stageFileName = `${sessionId}/${questionId}/${req.file.filename}`;
    const localFilePath = req.file.path;
    
    console.log('Local file path:', localFilePath);
    console.log('Stage file path:', stageFileName);

    try {
      // Upload file to Snowflake stage
      const putQuery = `PUT file://${localFilePath.replace(/\\/g, '/')} @video_files_stage/${sessionId}/${questionId}/`;
      console.log('Snowflake PUT query:', putQuery);
      
      const putResult = await executeQuery(putQuery);
      console.log('PUT result:', putResult);

      // Save video metadata to database
      const videoId = uuidv4();
      const insertQuery = `
        INSERT INTO video_responses (
          id, session_id, question_id, file_name, stage_path, 
          file_size_bytes, mime_type, upload_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'completed')
      `;

      await executeQuery(insertQuery, [
        videoId,
        sessionId,
        questionId,
        req.file.filename,
        stageFileName,
        req.file.size,
        req.file.mimetype
      ]);

      console.log('Video metadata saved to database');

      // 🎤 Process transcription BEFORE cleanup (read file contents into memory)
      let fileBuffer: Buffer | null = null;
      try {
        // Read file into memory before cleanup
        fileBuffer = fs.readFileSync(localFilePath);
        console.log(`File read into memory: ${fileBuffer.length} bytes`);
      } catch (readError) {
        console.error('Failed to read file for transcription:', readError);
      }

      // Clean up local file using TempFileManager
      await TempFileManager.forceDeleteFile(localFilePath);
      console.log('Local file cleaned up');

      // Start transcription with file buffer (in background)
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

      res.json({
        message: 'Video uploaded successfully',
        videoId,
        fileName: req.file.filename,
        size: req.file.size,
        stagePath: stageFileName,
        transcriptionStatus: 'processing' // Let frontend know transcription is happening
      });

    } catch (uploadError) {
      console.error('Snowflake upload error:', uploadError);
      
      // Clean up local file on error using TempFileManager
      await TempFileManager.forceDeleteFile(localFilePath);
      
      res.status(500).json({ error: 'Failed to upload video to storage' });
    }

  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Get video info
router.get('/session/:sessionId/question/:questionId', async (req: any, res: any) => {
  try {
    const { sessionId, questionId } = req.params;
    
    const query = 'SELECT * FROM video_responses WHERE session_id = ? AND question_id = ?';
    const rows = await executeQuery(query, [sessionId, questionId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const video = rows[0];
    res.json({
      id: video.ID,
      sessionId: video.SESSION_ID,
      questionId: video.QUESTION_ID,
      fileName: video.FILE_NAME,
      stagePath: video.STAGE_PATH,
      fileSize: video.FILE_SIZE_BYTES,
      mimeType: video.MIME_TYPE,
      uploadStatus: video.UPLOAD_STATUS,
      createdAt: video.CREATED_AT
    });

  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download video from Snowflake stage
router.get('/download/:sessionId/:questionId/:fileName', async (req: any, res: any) => {
  try {
    const { sessionId, questionId, fileName } = req.params;
    console.log('=== VIDEO DOWNLOAD REQUEST ===');
    console.log('Download request:', { sessionId, questionId, fileName });
    
    // Create temporary download directory
    const downloadPath = './temp_downloads';
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath, { recursive: true });
      console.log('Created download directory:', downloadPath);
    }

    // Snowflake compresses files with .gz extension
    const compressedFileName = fileName + '.gz';
    const localCompressedPath = path.join(downloadPath, compressedFileName);
    const localDecompressedPath = path.join(downloadPath, fileName);
    
    console.log('Compressed file path:', localCompressedPath);
    console.log('Decompressed file path:', localDecompressedPath);
    
    // Download from Snowflake stage
    const getQuery = `GET @video_files_stage/${sessionId}/${questionId}/${fileName} file://${downloadPath.replace(/\\/g, '/')}/`;
    console.log('Snowflake GET query:', getQuery);
    
    try {
      const getResult = await executeQuery(getQuery);
      console.log('GET command result:', getResult);
    } catch (getError) {
      console.error('Snowflake GET error:', getError);
      return res.status(500).json({ error: 'Failed to retrieve video from storage' });
    }

    // Check if compressed file exists
    console.log('Checking if compressed file exists:', localCompressedPath);
    if (!fs.existsSync(localCompressedPath)) {
      console.log('Compressed file not found. Listing download directory:');
      try {
        const files = fs.readdirSync(downloadPath);
        console.log('Files in download directory:', files);
      } catch (listError) {
        console.log('Could not list download directory');
      }
      return res.status(404).json({ error: 'Video file not found in storage' });
    }

    console.log('Compressed file exists! Size:', fs.statSync(localCompressedPath).size, 'bytes');

    // Decompress the file
    const zlib = require('zlib');
    
    console.log('Starting decompression...');
    
    // Create decompression promise
    const decompress = new Promise((resolve, reject) => {
      const gzipStream = fs.createReadStream(localCompressedPath);
      const gunzipStream = zlib.createGunzip();
      const outputStream = fs.createWriteStream(localDecompressedPath);

      gzipStream
        .pipe(gunzipStream)
        .pipe(outputStream)
        .on('finish', () => {
          console.log('Decompression completed');
          resolve(true);
        })
        .on('error', (err) => {
          console.error('Decompression error:', err);
          reject(err);
        });
    });

    // Wait for decompression to complete
    await decompress;

    // Verify decompressed file exists
    if (!fs.existsSync(localDecompressedPath)) {
      console.log('Decompressed file not created');
      return res.status(500).json({ error: 'Failed to decompress video file' });
    }

    console.log('Decompressed file exists! Size:', fs.statSync(localDecompressedPath).size, 'bytes');

    // Stream decompressed file to response
    const fileStream = fs.createReadStream(localDecompressedPath);
    res.setHeader('Content-Type', 'video/webm');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Accept-Ranges', 'bytes');
    
    console.log('Starting file stream...');
    fileStream.pipe(res);
    
    // IMPROVED CLEANUP with TempFileManager
    fileStream.on('end', async () => {
      console.log('Stream ended, cleaning up temp files');
      await TempFileManager.forceDeleteFile(localCompressedPath);
      await TempFileManager.forceDeleteFile(localDecompressedPath);
    });

    fileStream.on('close', async () => {
      console.log('Stream closed, ensuring cleanup');
      await TempFileManager.forceDeleteFile(localCompressedPath);
      await TempFileManager.forceDeleteFile(localDecompressedPath);
    });

    fileStream.on('error', async (streamError) => {
      console.error('Stream error:', streamError);
      await TempFileManager.forceDeleteFile(localCompressedPath);
      await TempFileManager.forceDeleteFile(localDecompressedPath);
      res.status(500).json({ error: 'Error streaming video' });
    });

    // Backup cleanup after 5 minutes
    setTimeout(async () => {
      console.log('Timeout cleanup for temp files');
      await TempFileManager.forceDeleteFile(localCompressedPath);
      await TempFileManager.forceDeleteFile(localDecompressedPath);
    }, 5 * 60 * 1000);

  } catch (error) {
    console.error('Video download error:', error);
    res.status(500).json({ error: 'Failed to download video' });
  }
});

export default router;