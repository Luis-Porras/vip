// backend/src/models/Keyword.ts
import { executeQuery } from '../config/snowflake';
import { v4 as uuidv4 } from 'uuid';

export interface TemplateKeyword {
  id: string;
  template_id: string;
  keyword: string;
  category: string;
  weight: number;
  created_at: string;
  created_by: string;
}

export interface VideoTranscript {
  id: string;
  video_response_id: string;
  session_id: string;
  question_id: string;
  transcript_text: string;
  confidence_score: number;
  word_count: number;
  processing_status: string;
  processed_at: string;
  created_at: string;
}

export interface KeywordMatch {
  id: string;
  transcript_id: string;
  keyword_id: string;
  match_count: number;
  match_positions: string;
  confidence_score: number;
  created_at: string;
}

export interface SessionKeywordScore {
  id: string;
  session_id: string;
  template_id: string;
  overall_score: number;
  technical_score: number;
  soft_skills_score: number;
  experience_score: number;
  total_keywords_found: number;
  total_keywords_possible: number;
  score_breakdown: string;
  calculated_at: string;
  updated_at: string;
}

export class KeywordModel {
  // Create keywords for a template
  static async createKeywords(templateId: string, keywords: Array<{
    keyword: string;
    category: string;
    weight: number;
  }>, createdBy: string): Promise<TemplateKeyword[]> {
    const createdKeywords: TemplateKeyword[] = [];
    
    for (const keywordData of keywords) {
      const id = uuidv4();
      const query = `
        INSERT INTO template_keywords (id, template_id, keyword, category, weight, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      await executeQuery(query, [
        id,
        templateId,
        keywordData.keyword.toLowerCase().trim(),
        keywordData.category,
        keywordData.weight,
        createdBy
      ]);
      
      const created = await this.getKeywordById(id);
      if (created) createdKeywords.push(created);
    }
    
    return createdKeywords;
  }

  // Get all keywords for a template
  static async getKeywordsByTemplate(templateId: string): Promise<TemplateKeyword[]> {
    const query = 'SELECT * FROM template_keywords WHERE template_id = ? ORDER BY category, keyword';
    const rows = await executeQuery(query, [templateId]);
    
    return rows.map(row => ({
      id: row.ID,
      template_id: row.TEMPLATE_ID,
      keyword: row.KEYWORD,
      category: row.CATEGORY,
      weight: row.WEIGHT,
      created_at: row.CREATED_AT,
      created_by: row.CREATED_BY
    }));
  }

  // Get keyword by ID
  static async getKeywordById(id: string): Promise<TemplateKeyword | null> {
    const query = 'SELECT * FROM template_keywords WHERE id = ?';
    const rows = await executeQuery(query, [id]);
    
    if (rows.length === 0) return null;
    
    const row = rows[0];
    return {
      id: row.ID,
      template_id: row.TEMPLATE_ID,
      keyword: row.KEYWORD,
      category: row.CATEGORY,
      weight: row.WEIGHT,
      created_at: row.CREATED_AT,
      created_by: row.CREATED_BY
    };
  }

  // Update keywords for a template (replace all)
  static async updateTemplateKeywords(templateId: string, keywords: Array<{
    keyword: string;
    category: string;
    weight: number;
  }>, updatedBy: string): Promise<TemplateKeyword[]> {
    // Delete existing keywords
    await executeQuery('DELETE FROM template_keywords WHERE template_id = ?', [templateId]);
    
    // Create new keywords
    return this.createKeywords(templateId, keywords, updatedBy);
  }

  // Delete keyword
  static async deleteKeyword(id: string): Promise<void> {
    await executeQuery('DELETE FROM template_keywords WHERE id = ?', [id]);
  }

  // Save transcript
  static async saveTranscript(transcriptData: {
    video_response_id: string;
    session_id: string;
    question_id: string;
    transcript_text: string;
    confidence_score: number;
    word_count: number;
  }): Promise<VideoTranscript> {
    const id = uuidv4();
    const query = `
      INSERT INTO video_transcripts 
      (id, video_response_id, session_id, question_id, transcript_text, confidence_score, word_count, processing_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'completed')
    `;
    
    await executeQuery(query, [
      id,
      transcriptData.video_response_id,
      transcriptData.session_id,
      transcriptData.question_id,
      transcriptData.transcript_text,
      transcriptData.confidence_score,
      transcriptData.word_count
    ]);

    const rows = await executeQuery('SELECT * FROM video_transcripts WHERE id = ?', [id]);
    const row = rows[0];
    
    return {
      id: row.ID,
      video_response_id: row.VIDEO_RESPONSE_ID,
      session_id: row.SESSION_ID,
      question_id: row.QUESTION_ID,
      transcript_text: row.TRANSCRIPT_TEXT,
      confidence_score: row.CONFIDENCE_SCORE,
      word_count: row.WORD_COUNT,
      processing_status: row.PROCESSING_STATUS,
      processed_at: row.PROCESSED_AT,
      created_at: row.CREATED_AT
    };
  }

  // Get transcript by video response ID
  static async getTranscriptByVideoId(videoResponseId: string): Promise<VideoTranscript | null> {
    const query = 'SELECT * FROM video_transcripts WHERE video_response_id = ?';
    const rows = await executeQuery(query, [videoResponseId]);
    
    if (rows.length === 0) return null;
    
    const row = rows[0];
    return {
      id: row.ID,
      video_response_id: row.VIDEO_RESPONSE_ID,
      session_id: row.SESSION_ID,
      question_id: row.QUESTION_ID,
      transcript_text: row.TRANSCRIPT_TEXT,
      confidence_score: row.CONFIDENCE_SCORE,
      word_count: row.WORD_COUNT,
      processing_status: row.PROCESSING_STATUS,
      processed_at: row.PROCESSED_AT,
      created_at: row.CREATED_AT
    };
  }

  // Calculate keyword matches for a session - FIXED VERSION
  static async calculateKeywordMatches(sessionId: string): Promise<SessionKeywordScore | null> {
    // Get session template
    const sessionQuery = 'SELECT template_id FROM interview_sessions WHERE id = ?';
    const sessionRows = await executeQuery(sessionQuery, [sessionId]);
    if (sessionRows.length === 0) return null;
    
    const templateId = sessionRows[0].TEMPLATE_ID;
    
    // Get all keywords for this template
    const keywords = await this.getKeywordsByTemplate(templateId);
    if (keywords.length === 0) return null;
    
    // Get all transcripts for this session
    const transcriptQuery = 'SELECT * FROM video_transcripts WHERE session_id = ? AND processing_status = \'completed\'';
    const transcripts = await executeQuery(transcriptQuery, [sessionId]);
    
    if (transcripts.length === 0) return null;
    
    // Combine all transcript text
    const allTranscriptText = transcripts
      .map(t => t.TRANSCRIPT_TEXT)
      .join(' ')
      .toLowerCase();
    
    // Track found keywords (DISTINCT count, not frequency)
    const foundKeywords = new Set<string>();
    const keywordsByCategory = {
      technical: new Set<string>(),
      soft_skills: new Set<string>(),
      experience: new Set<string>(),
      general: new Set<string>()
    };
    
    // Check each keyword (distinct presence, not frequency)
    for (const keyword of keywords) {
      const keywordRegex = new RegExp(`\\b${keyword.keyword}\\b`, 'i');
      const isFound = keywordRegex.test(allTranscriptText);
      
      if (isFound) {
        foundKeywords.add(keyword.keyword);
        keywordsByCategory[keyword.category as keyof typeof keywordsByCategory]?.add(keyword.keyword);
      }
    }
    
    // Calculate scores based on DISTINCT keywords found vs total keywords
    const totalKeywordsCount = keywords.length;
    const foundKeywordsCount = foundKeywords.size;
    
    // Overall score: percentage of distinct keywords found
    const overallScore = totalKeywordsCount > 0 ? (foundKeywordsCount / totalKeywordsCount) * 100 : 0;
    
    // Category scores: percentage of distinct keywords found per category
    const technicalKeywords = keywords.filter(k => k.category === 'technical');
    const technicalFound = keywordsByCategory.technical.size;
    const technicalScore = technicalKeywords.length > 0 ? (technicalFound / technicalKeywords.length) * 100 : 0;
    
    const softSkillsKeywords = keywords.filter(k => k.category === 'soft_skills');
    const softSkillsFound = keywordsByCategory.soft_skills.size;
    const softSkillsScore = softSkillsKeywords.length > 0 ? (softSkillsFound / softSkillsKeywords.length) * 100 : 0;
    
    const experienceKeywords = keywords.filter(k => k.category === 'experience');
    const experienceFound = keywordsByCategory.experience.size;
    const experienceScore = experienceKeywords.length > 0 ? (experienceFound / experienceKeywords.length) * 100 : 0;
    
    console.log('=== KEYWORD SCORING DEBUG ===');
    console.log('Total keywords in template:', totalKeywordsCount);
    console.log('Distinct keywords found:', foundKeywordsCount);
    console.log('Found keywords:', Array.from(foundKeywords));
    console.log('Overall score:', overallScore.toFixed(1) + '%');
    console.log('Technical:', technicalFound, '/', technicalKeywords.length, '=', technicalScore.toFixed(1) + '%');
    console.log('Soft Skills:', softSkillsFound, '/', softSkillsKeywords.length, '=', softSkillsScore.toFixed(1) + '%');
    console.log('Experience:', experienceFound, '/', experienceKeywords.length, '=', experienceScore.toFixed(1) + '%');
    console.log('=============================');
    
    // Save the score
    const scoreId = uuidv4();
    const scoreQuery = `
      INSERT INTO session_keyword_scores 
      (id, session_id, template_id, overall_score, technical_score, soft_skills_score, 
       experience_score, total_keywords_found, total_keywords_possible, score_breakdown)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const scoreBreakdown = JSON.stringify({
      distinct_keywords_found: foundKeywordsCount,
      total_keywords: totalKeywordsCount,
      found_keywords: Array.from(foundKeywords),
      category_breakdown: {
        technical: {
          found: technicalFound,
          total: technicalKeywords.length,
          keywords: Array.from(keywordsByCategory.technical)
        },
        soft_skills: {
          found: softSkillsFound,
          total: softSkillsKeywords.length,
          keywords: Array.from(keywordsByCategory.soft_skills)
        },
        experience: {
          found: experienceFound,
          total: experienceKeywords.length,
          keywords: Array.from(keywordsByCategory.experience)
        }
      }
    });
    
    await executeQuery(scoreQuery, [
      scoreId,
      sessionId,
      templateId,
      Math.round(overallScore * 100) / 100,
      Math.round(technicalScore * 100) / 100,
      Math.round(softSkillsScore * 100) / 100,
      Math.round(experienceScore * 100) / 100,
      foundKeywordsCount, // Now stores distinct count
      totalKeywordsCount,
      scoreBreakdown
    ]);
    
    // Return the calculated score
    const scoreRows = await executeQuery('SELECT * FROM session_keyword_scores WHERE id = ?', [scoreId]);
    const scoreRow = scoreRows[0];
    
    return {
      id: scoreRow.ID,
      session_id: scoreRow.SESSION_ID,
      template_id: scoreRow.TEMPLATE_ID,
      overall_score: scoreRow.OVERALL_SCORE,
      technical_score: scoreRow.TECHNICAL_SCORE,
      soft_skills_score: scoreRow.SOFT_SKILLS_SCORE,
      experience_score: scoreRow.EXPERIENCE_SCORE,
      total_keywords_found: scoreRow.TOTAL_KEYWORDS_FOUND,
      total_keywords_possible: scoreRow.TOTAL_KEYWORDS_POSSIBLE,
      score_breakdown: scoreRow.SCORE_BREAKDOWN,
      calculated_at: scoreRow.CALCULATED_AT,
      updated_at: scoreRow.UPDATED_AT
    };
  }

  // Get session keyword score
  static async getSessionScore(sessionId: string): Promise<SessionKeywordScore | null> {
    const query = 'SELECT * FROM session_keyword_scores WHERE session_id = ? ORDER BY updated_at DESC LIMIT 1';
    const rows = await executeQuery(query, [sessionId]);
    
    if (rows.length === 0) return null;
    
    const row = rows[0];
    return {
      id: row.ID,
      session_id: row.SESSION_ID,
      template_id: row.TEMPLATE_ID,
      overall_score: row.OVERALL_SCORE,
      technical_score: row.TECHNICAL_SCORE,
      soft_skills_score: row.SOFT_SKILLS_SCORE,
      experience_score: row.EXPERIENCE_SCORE,
      total_keywords_found: row.TOTAL_KEYWORDS_FOUND,
      total_keywords_possible: row.TOTAL_KEYWORDS_POSSIBLE,
      score_breakdown: row.SCORE_BREAKDOWN,
      calculated_at: row.CALCULATED_AT,
      updated_at: row.UPDATED_AT
    };
  }
}