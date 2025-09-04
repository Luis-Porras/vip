// backend/src/models/Video.ts
import { executeQuery } from '../config/snowflake';
import { v4 as uuidv4 } from 'uuid';

export interface VideoResponse {
  id: string;
  session_id: string;
  question_id: string;
  file_name: string;
  r2_key: string;           // NEW: R2 object key
  r2_url: string;          // NEW: Public R2 URL for streaming
  file_size_bytes: number;
  mime_type: string;
  upload_status: string;
  created_at: string;
  // Keep old fields for backward compatibility during migration
  stage_path?: string;     // DEPRECATED: Old Snowflake path
}

export class VideoModel {
  /**
   * Save video metadata with R2 information
   */
  static async saveVideoResponse(videoData: {
    id?: string;
    session_id: string;
    question_id: string;
    file_name: string;
    r2_key: string;
    r2_url: string;
    file_size_bytes: number;
    mime_type: string;
    upload_status?: string;
  }): Promise<VideoResponse> {
    const id = videoData.id || uuidv4();
    
    const query = `
      INSERT INTO video_responses (
        id, session_id, question_id, file_name, r2_key, r2_url,
        file_size_bytes, mime_type, upload_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await executeQuery(query, [
      id,
      videoData.session_id,
      videoData.question_id,
      videoData.file_name,
      videoData.r2_key,
      videoData.r2_url,
      videoData.file_size_bytes,
      videoData.mime_type,
      videoData.upload_status || 'completed'
    ]);

    return this.getById(id)!;
  }

  /**
   * Get video by ID
   */
  static async getById(id: string): Promise<VideoResponse | null> {
    const query = 'SELECT * FROM video_responses WHERE id = ?';
    const rows = await executeQuery(query, [id]);
    
    if (rows.length === 0) return null;
    
    const row = rows[0];
    return {
      id: row.ID,
      session_id: row.SESSION_ID,
      question_id: row.QUESTION_ID,
      file_name: row.FILE_NAME,
      r2_key: row.R2_KEY,
      r2_url: row.R2_URL,
      file_size_bytes: row.FILE_SIZE_BYTES,
      mime_type: row.MIME_TYPE,
      upload_status: row.UPLOAD_STATUS,
      created_at: row.CREATED_AT,
      stage_path: row.STAGE_PATH // For backward compatibility
    };
  }

  /**
   * Get video by session and question
   */
  static async getBySessionAndQuestion(sessionId: string, questionId: string): Promise<VideoResponse | null> {
    const query = 'SELECT * FROM video_responses WHERE session_id = ? AND question_id = ?';
    const rows = await executeQuery(query, [sessionId, questionId]);
    
    if (rows.length === 0) return null;
    
    const row = rows[0];
    return {
      id: row.ID,
      session_id: row.SESSION_ID,
      question_id: row.QUESTION_ID,
      file_name: row.FILE_NAME,
      r2_key: row.R2_KEY,
      r2_url: row.R2_URL,
      file_size_bytes: row.FILE_SIZE_BYTES,
      mime_type: row.MIME_TYPE,
      upload_status: row.UPLOAD_STATUS,
      created_at: row.CREATED_AT,
      stage_path: row.STAGE_PATH
    };
  }

  /**
   * Get all videos for a session
   */
  static async getBySession(sessionId: string): Promise<VideoResponse[]> {
    const query = 'SELECT * FROM video_responses WHERE session_id = ? ORDER BY created_at';
    const rows = await executeQuery(query, [sessionId]);
    
    return rows.map(row => ({
      id: row.ID,
      session_id: row.SESSION_ID,
      question_id: row.QUESTION_ID,
      file_name: row.FILE_NAME,
      r2_key: row.R2_KEY,
      r2_url: row.R2_URL,
      file_size_bytes: row.FILE_SIZE_BYTES,
      mime_type: row.MIME_TYPE,
      upload_status: row.UPLOAD_STATUS,
      created_at: row.CREATED_AT,
      stage_path: row.STAGE_PATH
    }));
  }

  /**
   * Update video status
   */
  static async updateStatus(id: string, status: string): Promise<void> {
    const query = 'UPDATE video_responses SET upload_status = ? WHERE id = ?';
    await executeQuery(query, [status, id]);
  }

  /**
   * Delete video record
   */
  static async deleteById(id: string): Promise<void> {
    const query = 'DELETE FROM video_responses WHERE id = ?';
    await executeQuery(query, [id]);
  }

  /**
   * Check if video exists for session/question
   */
  static async exists(sessionId: string, questionId: string): Promise<boolean> {
    const query = 'SELECT COUNT(*) as count FROM video_responses WHERE session_id = ? AND question_id = ?';
    const rows = await executeQuery(query, [sessionId, questionId]);
    
    return rows[0].COUNT > 0;
  }
}