//backend/src/models/Evaluation.ts
import { executeQuery } from '../config/snowflake';
import { v4 as uuidv4 } from 'uuid';

export interface QuestionEvaluation {
  id: string;
  session_id: string;
  question_id: string;
  rating: number | null;
  notes: string;
  evaluated_by: string;
  created_at: string;
  updated_at: string;
}

export class EvaluationModel {
  static async saveEvaluation(evaluationData: {
    session_id: string;
    question_id: string;
    rating: number | null;
    notes: string;
    evaluated_by: string;
  }): Promise<QuestionEvaluation> {
    // Check if evaluation already exists
    const existing = await this.getEvaluation(evaluationData.session_id, evaluationData.question_id);
    
    if (existing) {
      // Update existing evaluation
      const query = `
        UPDATE question_evaluations 
        SET rating = ?, notes = ?, updated_at = CURRENT_TIMESTAMP()
        WHERE session_id = ? AND question_id = ?
      `;
      
      await executeQuery(query, [
        evaluationData.rating,
        evaluationData.notes,
        evaluationData.session_id,
        evaluationData.question_id
      ]);
      
      return this.getEvaluation(evaluationData.session_id, evaluationData.question_id)!;
    } else {
      // Create new evaluation
      const id = uuidv4();
      const query = `
        INSERT INTO question_evaluations (id, session_id, question_id, rating, notes, evaluated_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      await executeQuery(query, [
        id,
        evaluationData.session_id,
        evaluationData.question_id,
        evaluationData.rating,
        evaluationData.notes,
        evaluationData.evaluated_by
      ]);
      
      return this.getEvaluation(evaluationData.session_id, evaluationData.question_id)!;
    }
  }

  static async getEvaluation(sessionId: string, questionId: string): Promise<QuestionEvaluation | null> {
    const query = 'SELECT * FROM question_evaluations WHERE session_id = ? AND question_id = ?';
    const rows = await executeQuery(query, [sessionId, questionId]);
    
    if (rows.length === 0) return null;
    
    const row = rows[0];
    return {
      id: row.ID,
      session_id: row.SESSION_ID,
      question_id: row.QUESTION_ID,
      rating: row.RATING,
      notes: row.NOTES,
      evaluated_by: row.EVALUATED_BY,
      created_at: row.CREATED_AT,
      updated_at: row.UPDATED_AT
    };
  }

  static async getSessionEvaluations(sessionId: string): Promise<QuestionEvaluation[]> {
    const query = 'SELECT * FROM question_evaluations WHERE session_id = ? ORDER BY created_at';
    const rows = await executeQuery(query, [sessionId]);
    
    return rows.map(row => ({
      id: row.ID,
      session_id: row.SESSION_ID,
      question_id: row.QUESTION_ID,
      rating: row.RATING,
      notes: row.NOTES,
      evaluated_by: row.EVALUATED_BY,
      created_at: row.CREATED_AT,
      updated_at: row.UPDATED_AT
    }));
  }

  static async getAverageRating(sessionId: string): Promise<number | null> {
    const query = `
      SELECT AVG(rating) as avg_rating 
      FROM question_evaluations 
      WHERE session_id = ? AND rating IS NOT NULL
    `;
    const rows = await executeQuery(query, [sessionId]);
    
    if (rows.length === 0 || rows[0].AVG_RATING === null) return null;
    return parseFloat(rows[0].AVG_RATING);
  }
}


