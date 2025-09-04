// backend/src/models/Interview.ts
import { executeQuery } from '../config/snowflake';
import { v4 as uuidv4 } from 'uuid';

export interface InterviewTemplate {
  id: string;
  title: string;
  description: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InterviewQuestion {
  id: string;
  template_id: string;
  question_text: string;
  time_limit: number;
  question_order: number;
  created_at: string;
}

export interface InterviewSession {
  id: string;
  template_id: string;
  candidate_email: string;
  candidate_name: string;
  status: string;
  started_at?: string;
  completed_at?: string;
  expires_at: string;
  created_at: string;
}

export class InterviewModel {
  static async createTemplate(templateData: {
    title: string;
    description: string;
    created_by: string;
  }): Promise<InterviewTemplate> {
    const id = uuidv4();
    
    const query = `
      INSERT INTO interview_templates (id, title, description, created_by)
      VALUES (?, ?, ?, ?)
    `;
    
    await executeQuery(query, [
      id,
      templateData.title,
      templateData.description,
      templateData.created_by
    ]);

    return this.getTemplateById(id);
  }

  static async addQuestion(questionData: {
    template_id: string;
    question_text: string;
    time_limit: number;
    question_order: number;
  }): Promise<InterviewQuestion> {
    const id = uuidv4();
    
    const query = `
      INSERT INTO interview_questions (id, template_id, question_text, time_limit, question_order)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    await executeQuery(query, [
      id,
      questionData.template_id,
      questionData.question_text,
      questionData.time_limit,
      questionData.question_order
    ]);

    const rows = await executeQuery('SELECT * FROM interview_questions WHERE id = ?', [id]);
    const row = rows[0];
    return {
      id: row.ID,
      template_id: row.TEMPLATE_ID,
      question_text: row.QUESTION_TEXT,
      time_limit: row.TIME_LIMIT,
      question_order: row.QUESTION_ORDER,
      created_at: row.CREATED_AT
    };
  }

  static async getTemplateById(id: string): Promise<InterviewTemplate | null> {
    const query = 'SELECT * FROM interview_templates WHERE id = ? AND is_active = true';
    const rows = await executeQuery(query, [id]);
    
    if (rows.length === 0) return null;
    
    const row = rows[0];
    return {
      id: row.ID,
      title: row.TITLE,
      description: row.DESCRIPTION,
      created_by: row.CREATED_BY,
      is_active: row.IS_ACTIVE,
      created_at: row.CREATED_AT,
      updated_at: row.UPDATED_AT
    };
  }

  static async getTemplatesByUser(userId: string): Promise<InterviewTemplate[]> {
    const query = 'SELECT * FROM interview_templates WHERE created_by = ? AND is_active = true ORDER BY created_at DESC';
    const rows = await executeQuery(query, [userId]);
    
    return rows.map(row => ({
      id: row.ID,
      title: row.TITLE,
      description: row.DESCRIPTION,
      created_by: row.CREATED_BY,
      is_active: row.IS_ACTIVE,
      created_at: row.CREATED_AT,
      updated_at: row.UPDATED_AT
    }));
  }

  static async getQuestionsByTemplate(templateId: string): Promise<InterviewQuestion[]> {
    const query = 'SELECT * FROM interview_questions WHERE template_id = ? ORDER BY question_order';
    const rows = await executeQuery(query, [templateId]);
    
    return rows.map(row => ({
      id: row.ID,
      template_id: row.TEMPLATE_ID,
      question_text: row.QUESTION_TEXT,
      time_limit: row.TIME_LIMIT,
      question_order: row.QUESTION_ORDER,
      created_at: row.CREATED_AT
    }));
  }

  static async createSession(sessionData: {
    template_id: string;
    candidate_email: string;
    candidate_name: string;
  }): Promise<InterviewSession> {
    const id = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry
    
    const query = `
      INSERT INTO interview_sessions (id, template_id, candidate_email, candidate_name, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    await executeQuery(query, [
      id,
      sessionData.template_id,
      sessionData.candidate_email,
      sessionData.candidate_name,
      expiresAt.toISOString()
    ]);

    const rows = await executeQuery('SELECT * FROM interview_sessions WHERE id = ?', [id]);
    const row = rows[0];
    return {
      id: row.ID,
      template_id: row.TEMPLATE_ID,
      candidate_email: row.CANDIDATE_EMAIL,
      candidate_name: row.CANDIDATE_NAME,
      status: row.STATUS,
      started_at: row.STARTED_AT,
      completed_at: row.COMPLETED_AT,
      expires_at: row.EXPIRES_AT,
      created_at: row.CREATED_AT
    };
  }

  static async getSessionById(id: string): Promise<InterviewSession | null> {
    const query = 'SELECT * FROM interview_sessions WHERE id = ?';
    const rows = await executeQuery(query, [id]);
    
    if (rows.length === 0) return null;
    
    const row = rows[0];
    return {
      id: row.ID,
      template_id: row.TEMPLATE_ID,
      candidate_email: row.CANDIDATE_EMAIL,
      candidate_name: row.CANDIDATE_NAME,
      status: row.STATUS,
      started_at: row.STARTED_AT,
      completed_at: row.COMPLETED_AT,
      expires_at: row.EXPIRES_AT,
      created_at: row.CREATED_AT
    };
  }

static async updateSessionStatus(id: string, status: string): Promise<void> {
  const query = 'UPDATE interview_sessions SET status = ? WHERE id = ?';
  await executeQuery(query, [status, id]);
}
}


