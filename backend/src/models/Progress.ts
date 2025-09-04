// backend/src/models/Progress.ts
import { executeQuery } from '../config/snowflake';

export interface SessionProgress {
  session_id: string;
  question_id: string;
  attempts_used: number;
  is_completed: boolean;
  last_attempt_at: string;
  created_at: string;
}

export class ProgressModel {
  static async getQuestionProgress(sessionId: string, questionId: string): Promise<SessionProgress | null> {
    const query = 'SELECT * FROM session_progress WHERE session_id = ? AND question_id = ?';
    const rows = await executeQuery(query, [sessionId, questionId]);
    
    if (rows.length === 0) return null;
    
    const row = rows[0];
    return {
      session_id: row.SESSION_ID,
      question_id: row.QUESTION_ID,
      attempts_used: row.ATTEMPTS_USED,
      is_completed: row.IS_COMPLETED,
      last_attempt_at: row.LAST_ATTEMPT_AT,
      created_at: row.CREATED_AT
    };
  }

  static async initializeQuestionProgress(sessionId: string, questionId: string): Promise<SessionProgress> {
    // Insert or get existing progress
    const existing = await this.getQuestionProgress(sessionId, questionId);
    if (existing) return existing;

    const query = `
      INSERT INTO session_progress (session_id, question_id, attempts_used, is_completed)
      VALUES (?, ?, 0, false)
    `;
    
    await executeQuery(query, [sessionId, questionId]);
    return this.getQuestionProgress(sessionId, questionId)!;
  }

  static async recordAttempt(sessionId: string, questionId: string): Promise<number> {
    const query = `
      UPDATE session_progress 
      SET attempts_used = attempts_used + 1, last_attempt_at = CURRENT_TIMESTAMP()
      WHERE session_id = ? AND question_id = ?
    `;
    
    await executeQuery(query, [sessionId, questionId]);
    
    // Return new attempt count
    const progress = await this.getQuestionProgress(sessionId, questionId);
    return progress?.attempts_used || 0;
  }

  static async markQuestionCompleted(sessionId: string, questionId: string): Promise<void> {
    const query = `
      UPDATE session_progress 
      SET is_completed = true, last_attempt_at = CURRENT_TIMESTAMP()
      WHERE session_id = ? AND question_id = ?
    `;
    
    await executeQuery(query, [sessionId, questionId]);
  }

  static async getSessionProgress(sessionId: string): Promise<SessionProgress[]> {
    const query = 'SELECT * FROM session_progress WHERE session_id = ? ORDER BY created_at';
    const rows = await executeQuery(query, [sessionId]);
    
    return rows.map(row => ({
      session_id: row.SESSION_ID,
      question_id: row.QUESTION_ID,
      attempts_used: row.ATTEMPTS_USED,
      is_completed: row.IS_COMPLETED,
      last_attempt_at: row.LAST_ATTEMPT_AT,
      created_at: row.CREATED_AT
    }));
  }

  static async canRetake(sessionId: string, questionId: string, maxRetakes: number = 1): Promise<boolean> {
    const progress = await this.getQuestionProgress(sessionId, questionId);
    if (!progress) return true; // First attempt
    
    return progress.attempts_used < maxRetakes && !progress.is_completed;
  }
}

