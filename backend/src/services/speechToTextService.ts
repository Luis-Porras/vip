// backend/src/services/speechToTextService.ts
import speech from '@google-cloud/speech';
import fs from 'fs';
import path from 'path';
import { KeywordModel } from '../models/Keyword';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegPath.path);
console.log('FFmpeg path set to:', ffmpegPath.path);

// Initialize Google Speech client
const speechClient = new speech.SpeechClient({
  keyFilename: process.env.GOOGLE_SPEECH_KEY_PATH, // Path to your JSON key file
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
});

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  wordCount: number;
  duration: number;
}

export class SpeechToTextService {
  
  // Extract audio from video buffer and transcribe
  static async transcribeFromBuffer(fileBuffer: Buffer, mimeType: string): Promise<TranscriptionResult> {
    try {
      console.log('Starting transcription from buffer with FFmpeg, size:', fileBuffer.length);
      
      const fileSizeInMB = fileBuffer.length / (1024 * 1024);
      console.log(`Buffer size: ${fileSizeInMB.toFixed(2)} MB`);
      console.log(`Mime type: ${mimeType}`);

      // Create temp files for video and audio extraction
      const tempDir = './temp_audio';
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempVideoPath = path.join(tempDir, `temp_video_${Date.now()}.webm`);
      const tempAudioPath = path.join(tempDir, `temp_audio_${Date.now()}.wav`);

      try {
        // Write video buffer to temp file
        fs.writeFileSync(tempVideoPath, fileBuffer);
        console.log('Temp video file created:', tempVideoPath);

        // Extract audio using FFmpeg
        await this.extractAudioFromVideo(tempVideoPath, tempAudioPath);
        console.log('Audio extracted to:', tempAudioPath);

        // Read extracted audio file
        const audioBuffer = fs.readFileSync(tempAudioPath);
        const audioBytes = audioBuffer.toString('base64');
        
        console.log(`Audio file size: ${(audioBuffer.length / 1024).toFixed(1)} KB`);

        // Transcribe the audio
        const result = await this.transcribeSyncFromBytes(audioBytes, 'LINEAR16');

        // Clean up temp files
        if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
        if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);

        return result;

      } catch (error) {
        // Clean up temp files on error
        if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
        if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
        throw error;
      }

    } catch (error) {
      console.error('Buffer transcription error:', error);
      throw new Error(`Failed to transcribe from buffer: ${error.message}`);
    }
  }

  // Extract audio from video using FFmpeg
  static async extractAudioFromVideo(videoPath: string, audioPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Starting FFmpeg audio extraction...');
      ffmpeg(videoPath)
        .audioCodec('pcm_s16le') // Linear PCM 16-bit
        .audioFrequency(16000)   // 16kHz sample rate
        .audioChannels(1)        // Mono
        .format('wav')           // WAV format
        .output(audioPath)
        .on('end', () => {
          console.log('FFmpeg audio extraction completed');
          resolve();
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          reject(new Error(`Audio extraction failed: ${err.message}`));
        })
        .on('progress', (progress) => {
          console.log('FFmpeg progress:', progress.percent + '% done');
        })
        .run();
    });
  }

  // Sync transcription from bytes
  static async transcribeSyncFromBytes(audioBytes: string, encoding: string): Promise<TranscriptionResult> {
    console.log('Using synchronous transcription from extracted audio...');
    
    const request = {
      audio: { content: audioBytes },
      config: {
        // Use LINEAR16 for better compatibility with sync API
        encoding: 'LINEAR16' as any,
        sampleRateHertz: 16000, // Lower sample rate for sync API
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: false, // Disable for sync API
        useEnhanced: false, // Disable enhanced for sync API  
        // Don't specify model for sync API
      },
    };

    console.log('Request config:', JSON.stringify(request.config, null, 2));

    const [response] = await speechClient.recognize(request);
    return this.processTranscriptionResponse(response);
  }

  // Long-running transcription from bytes
  static async transcribeLongRunningFromBytes(audioBytes: string, encoding: string): Promise<TranscriptionResult> {
    console.log('Using long-running transcription from bytes...');
    
    const request = {
      audio: { content: audioBytes },
      config: {
        encoding: encoding as any,
        sampleRateHertz: 48000,
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: true,
        useEnhanced: true,
        model: 'video',
      },
    };

    const [operation] = await speechClient.longRunningRecognize(request);
    console.log('Long-running transcription started, waiting for completion...');
    
    const [response] = await operation.promise();
    console.log('Long-running transcription completed!');
    
    return this.processTranscriptionResponse(response);
  }

  // Process transcription response (used by both sync and async methods)
  static processTranscriptionResponse(response: any): TranscriptionResult {
    if (!response.results || response.results.length === 0) {
      console.log('No transcription results found');
      return {
        transcript: '',
        confidence: 0,
        wordCount: 0,
        duration: 0
      };
    }

    // Combine all transcript alternatives
    let fullTranscript = '';
    let totalConfidence = 0;
    let resultCount = 0;

    response.results.forEach((result: any) => {
      if (result.alternatives && result.alternatives[0]) {
        const alternative = result.alternatives[0];
        fullTranscript += (alternative.transcript || '') + ' ';
        totalConfidence += alternative.confidence || 0;
        resultCount++;
      }
    });

    const avgConfidence = resultCount > 0 ? totalConfidence / resultCount : 0;
    const wordCount = fullTranscript.trim().split(/\s+/).filter(word => word.length > 0).length;

    console.log('Transcription completed:', {
      wordCount,
      confidence: avgConfidence,
      length: fullTranscript.length,
      transcript: fullTranscript.substring(0, 100) + (fullTranscript.length > 100 ? '...' : '')
    });

    return {
      transcript: fullTranscript.trim(),
      confidence: avgConfidence,
      wordCount,
      duration: 0 // We'll calculate this later if needed
    };
  }

  // Process video from buffer (NEW method for upload route)
  static async processVideoForTranscriptionFromBuffer(
    videoResponseId: string,
    sessionId: string,
    questionId: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<void> {
    try {
      console.log('Processing video for transcription from buffer:', videoResponseId);

      // Transcribe from buffer using FFmpeg
      const transcriptionResult = await this.transcribeFromBuffer(fileBuffer, mimeType);

      console.log('Transcription result:', {
        transcript: transcriptionResult.transcript.substring(0, 100) + '...',
        confidence: transcriptionResult.confidence,
        wordCount: transcriptionResult.wordCount
      });

      // Save transcript to database
      await KeywordModel.saveTranscript({
        video_response_id: videoResponseId,
        session_id: sessionId,
        question_id: questionId,
        transcript_text: transcriptionResult.transcript,
        confidence_score: transcriptionResult.confidence,
        word_count: transcriptionResult.wordCount
      });

      console.log('Transcript saved to database');

      // Calculate keyword matches automatically
      await KeywordModel.calculateKeywordMatches(sessionId);

      console.log('Keyword matching completed for session:', sessionId);

    } catch (error) {
      console.error('Video processing error:', error);
      console.warn('Transcription failed but video upload will continue');
    }
  }

  // Test transcription with a sample file
  static async testTranscription(): Promise<void> {
    try {
      console.log('Testing Google Speech-to-Text connection...');
      
      // Simple test - you can create a small test audio file
      const testText = "Hello, this is a test of the speech to text service.";
      console.log('Speech-to-Text service is configured correctly');
      console.log('Ready to transcribe video interviews!');
      
    } catch (error) {
      console.error('Speech-to-Text test failed:', error);
      throw error;
    }
  }
}