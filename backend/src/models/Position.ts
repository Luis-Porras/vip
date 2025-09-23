
//backend/src/models/Position.ts
import { executeQuery } from '../config/snowflake';
import { v4 as uuidv4 } from 'uuid';
import { InterviewModel } from './Interview';
import { KeywordModel } from './Keyword';

export interface JobPosition {
  id: string;
  title: string;
  description: string;
  template_id: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PositionQuestion {
  id: string;
  position_id: string;
  question_text: string;
  time_limit: number;
  question_order: number;
  created_at: string;
}

export interface PositionKeyword {
  id: string;
  position_id: string;
  keyword: string;
  category: string;
  weight: number;
  created_at: string;
}

export interface PositionDetail extends JobPosition {
  questions: PositionQuestion[];
  keywords: PositionKeyword[];
  templateTitle: string;
}

export class PositionModel {
  /**
   * Create a new position from a template
   * This copies all template questions and keywords to the position
   */
  static async createFromTemplate(positionData: {
    title: string;
    description: string;
    template_id: string;
    created_by: string;
  }): Promise<JobPosition> {
    const positionId = uuidv4();
    
    try {
      // 1. Create the position record
      const createPositionQuery = `
        INSERT INTO job_positions (id, title, description, template_id, created_by)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      await executeQuery(createPositionQuery, [
        positionId,
        positionData.title,
        positionData.description,
        positionData.template_id,
        positionData.created_by
      ]);

      // 2. Copy template questions to position questions
      const templateQuestions = await InterviewModel.getQuestionsByTemplate(positionData.template_id);
      
      for (const question of templateQuestions) {
        const questionId = uuidv4();
        const copyQuestionQuery = `
          INSERT INTO position_questions (id, position_id, question_text, time_limit, question_order)
          VALUES (?, ?, ?, ?, ?)
        `;
        
        await executeQuery(copyQuestionQuery, [
          questionId,
          positionId,
          question.question_text,
          question.time_limit,
          question.question_order
        ]);
      }

      // 3. Copy template keywords to position keywords
      const templateKeywords = await KeywordModel.getKeywordsByTemplate(positionData.template_id);
      
      for (const keyword of templateKeywords) {
        const keywordId = uuidv4();
        const copyKeywordQuery = `
          INSERT INTO position_keywords (id, position_id, keyword, category, weight)
          VALUES (?, ?, ?, ?, ?)
        `;
        
        await executeQuery(copyKeywordQuery, [
          keywordId,
          positionId,
          keyword.keyword,
          keyword.category,
          keyword.weight
        ]);
      }

      console.log(`Position created from template: ${positionId}`);
      return this.getPositionById(positionId)!;
      
    } catch (error) {
      console.error('Failed to create position from template:', error);
      throw error;
    }
  }

  /**
   * Get position by ID
   */
  static async getPositionById(id: string): Promise<JobPosition | null> {
    const query = 'SELECT * FROM job_positions WHERE id = ? AND is_active = true';
    const rows = await executeQuery(query, [id]);
    
    if (rows.length === 0) return null;
    
    const row = rows[0];
    return {
      id: row.ID,
      title: row.TITLE,
      description: row.DESCRIPTION,
      template_id: row.TEMPLATE_ID,
      created_by: row.CREATED_BY,
      is_active: row.IS_ACTIVE,
      created_at: row.CREATED_AT,
      updated_at: row.UPDATED_AT
    };
  }

  /**
   * Get all positions for a user
   */
  static async getPositionsByUser(userId: string): Promise<JobPosition[]> {
    const query = `
      SELECT p.*
      FROM job_positions p
      WHERE p.created_by = ? AND p.is_active = true 
      ORDER BY p.created_at DESC
    `;
    const rows = await executeQuery(query, [userId]);
    
    return rows.map(row => ({
      id: row.ID,
      title: row.TITLE,
      description: row.DESCRIPTION,
      template_id: row.TEMPLATE_ID,
      created_by: row.CREATED_BY,
      is_active: row.IS_ACTIVE,
      created_at: row.CREATED_AT,
      updated_at: row.UPDATED_AT
    }));
  }

  /**
   * Get position with all questions and keywords
   */
  static async getPositionDetail(positionId: string): Promise<PositionDetail | null> {
    const position = await this.getPositionById(positionId);
    if (!position) return null;

    // Get template title
    const template = await InterviewModel.getTemplateById(position.template_id);
    
    // Get position questions
    const questions = await this.getPositionQuestions(positionId);
    
    // Get position keywords
    const keywords = await this.getPositionKeywords(positionId);

    return {
      ...position,
      questions,
      keywords,
      templateTitle: template?.title || 'Unknown Template'
    };
  }

  /**
   * Get questions for a position
   */
  static async getPositionQuestions(positionId: string): Promise<PositionQuestion[]> {
    const query = 'SELECT * FROM position_questions WHERE position_id = ? ORDER BY question_order';
    const rows = await executeQuery(query, [positionId]);
    
    return rows.map(row => ({
      id: row.ID,
      position_id: row.POSITION_ID,
      question_text: row.QUESTION_TEXT,
      time_limit: row.TIME_LIMIT,
      question_order: row.QUESTION_ORDER,
      created_at: row.CREATED_AT
    }));
  }

  /**
   * Get keywords for a position
   */
  static async getPositionKeywords(positionId: string): Promise<PositionKeyword[]> {
    const query = 'SELECT * FROM position_keywords WHERE position_id = ? ORDER BY category, keyword';
    const rows = await executeQuery(query, [positionId]);
    
    return rows.map(row => ({
      id: row.ID,
      position_id: row.POSITION_ID,
      keyword: row.KEYWORD,
      category: row.CATEGORY,
      weight: row.WEIGHT,
      created_at: row.CREATED_AT
    }));
  }

  /**
   * Update position basic info
   */
  static async updatePosition(positionId: string, updates: {
    title?: string;
    description?: string;
  }): Promise<void> {
    const fields = [];
    const values = [];
    
    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    
    if (fields.length === 0) return;
    
    fields.push('updated_at = CURRENT_TIMESTAMP()');
    values.push(positionId);
    
    const query = `UPDATE job_positions SET ${fields.join(', ')} WHERE id = ?`;
    await executeQuery(query, values);
  }

  /**
   * Link session to position (for tracking)
   */
  static async linkSessionToPosition(sessionId: string, positionId: string): Promise<void> {
    const query = 'UPDATE interview_sessions SET position_id = ? WHERE id = ?';
    await executeQuery(query, [positionId, sessionId]);
  }

  /**
   * Get sessions for a position
   */
  static async getPositionSessions(positionId: string): Promise<any[]> {
    const query = `
      SELECT 
        s.id,
        s.candidate_email,
        s.candidate_name,
        s.status,
        s.started_at,
        s.completed_at,
        s.expires_at,
        s.created_at,
        COALESCE(v.videos_submitted, 0) as videos_submitted,
        COALESCE(q.total_questions, 0) as total_questions
      FROM interview_sessions s
      LEFT JOIN (
        SELECT 
          session_id, 
          COUNT(*) as videos_submitted 
        FROM video_responses 
        WHERE upload_status = 'completed'
        GROUP BY session_id
      ) v ON s.id = v.session_id
      LEFT JOIN (
        SELECT 
          position_id, 
          COUNT(*) as total_questions 
        FROM position_questions 
        GROUP BY position_id
      ) q ON s.position_id = q.position_id
      WHERE s.position_id = ?
      ORDER BY s.created_at DESC
    `;
    
    const rows = await executeQuery(query, [positionId]);
    
    return rows.map(row => ({
      id: row.ID,
      candidateEmail: row.CANDIDATE_EMAIL,
      candidateName: row.CANDIDATE_NAME,
      status: row.STATUS,
      startedAt: row.STARTED_AT,
      completedAt: row.COMPLETED_AT,
      expiresAt: row.EXPIRES_AT,
      createdAt: row.CREATED_AT,
      videosSubmitted: row.VIDEOS_SUBMITTED || 0,
      totalQuestions: row.TOTAL_QUESTIONS || 0
    }));
  }

  // Add these methods to your PositionModel class (after your existing methods):

  /**
   * Update position questions (replace all)
   */
  static async updatePositionQuestions(positionId: string, questions: Array<{
    text: string;
    timeLimit: number;
  }>): Promise<PositionQuestion[]> {
    // Delete existing questions
    await executeQuery('DELETE FROM position_questions WHERE position_id = ?', [positionId]);
    
    // Insert new questions
    const updatedQuestions: PositionQuestion[] = [];
    
    for (let i = 0; i < questions.length; i++) {
      const questionId = uuidv4();
      const query = `
        INSERT INTO position_questions (id, position_id, question_text, time_limit, question_order)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      await executeQuery(query, [
        questionId,
        positionId,
        questions[i].text,
        questions[i].timeLimit,
        i + 1
      ]);

      const newQuestion = await this.getPositionQuestionById(questionId);
      if (newQuestion) updatedQuestions.push(newQuestion);
    }
    
    return updatedQuestions;
  }

  /**
   * Update position keywords (replace all)
   */
  static async updatePositionKeywords(positionId: string, keywords: Array<{
    keyword: string;
    category: string;
    weight: number;
  }>): Promise<PositionKeyword[]> {
    // Delete existing keywords
    await executeQuery('DELETE FROM position_keywords WHERE position_id = ?', [positionId]);
    
    // Insert new keywords
    const updatedKeywords: PositionKeyword[] = [];
    
    for (const keyword of keywords) {
      const keywordId = uuidv4();
      const query = `
        INSERT INTO position_keywords (id, position_id, keyword, category, weight)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      await executeQuery(query, [
        keywordId,
        positionId,
        keyword.keyword.toLowerCase().trim(),
        keyword.category,
        keyword.weight
      ]);

      const newKeyword = await this.getPositionKeywordById(keywordId);
      if (newKeyword) updatedKeywords.push(newKeyword);
    }
    
    return updatedKeywords;
  }

  /**
   * Delete position (soft delete)
   */
  static async deletePosition(positionId: string): Promise<void> {
    const query = 'UPDATE job_positions SET is_active = false, updated_at = CURRENT_TIMESTAMP() WHERE id = ?';
    await executeQuery(query, [positionId]);
  }

  /**
   * Helper: Get single question by ID
   */
  private static async getPositionQuestionById(id: string): Promise<PositionQuestion | null> {
    const query = 'SELECT * FROM position_questions WHERE id = ?';
    const rows = await executeQuery(query, [id]);
    
    if (rows.length === 0) return null;
    
    const row = rows[0];
    return {
      id: row.ID,
      position_id: row.POSITION_ID,
      question_text: row.QUESTION_TEXT,
      time_limit: row.TIME_LIMIT,
      question_order: row.QUESTION_ORDER,
      created_at: row.CREATED_AT
    };
  }

  /**
   * Helper: Get single keyword by ID
   */
  private static async getPositionKeywordById(id: string): Promise<PositionKeyword | null> {
    const query = 'SELECT * FROM position_keywords WHERE id = ?';
    const rows = await executeQuery(query, [id]);
    
    if (rows.length === 0) return null;
    
    const row = rows[0];
    return {
      id: row.ID,
      position_id: row.POSITION_ID,
      keyword: row.KEYWORD,
      category: row.CATEGORY,
      weight: row.WEIGHT,
      created_at: row.CREATED_AT
    };
  }
}