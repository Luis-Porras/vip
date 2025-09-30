// backend/src/routes/admin.ts
import express from 'express';
import { executeQuery } from '../config/snowflake';
import { InterviewModel } from '../models/Interview';
import { EvaluationModel } from '../models/Evaluation';
import { EmailService } from '../services/emailService';
import { KeywordModel } from '../models/Keyword';

const router = express.Router();

// Test route
router.get('/test', (req: any, res: any) => {
  res.json({ message: 'Admin routes working!', user: req.user });
});


// Get all interview templates for the authenticated user
router.get('/templates', async (req: any, res: any) => {
  try {
    const userId = req.user?.id; // Add this fallback
    console.log('Using userId:', userId); 
    
    const templates = await InterviewModel.getTemplatesByUser(userId);
    res.json(templates);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new interview template
router.post('/templates', async (req: any, res: any) => {
  try {
    const { title, description, questions } = req.body;
    const userId = req.user?.id;

    if (!title || !questions || questions.length === 0) {
      return res.status(400).json({ error: 'Title and questions are required' });
    }

    // Create template
    const template = await InterviewModel.createTemplate({
      title,
      description: description || '',
      created_by: userId
    });

    // Add questions
    for (let i = 0; i < questions.length; i++) {
      await InterviewModel.addQuestion({
        template_id: template.id,
        question_text: questions[i].text,
        time_limit: questions[i].timeLimit || 90,
        question_order: i + 1
      });
    }

    res.status(201).json({
      message: 'Interview template created successfully',
      template
    });

  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific template with questions
router.get('/templates/:templateId', async (req: any, res: any) => {
  try {
    const { templateId } = req.params;
    
    const template = await InterviewModel.getTemplateById(templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const questions = await InterviewModel.getQuestionsByTemplate(templateId);
    
    res.json({
      ...template,
      questions
    });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update template
router.put('/templates/:templateId', async (req: any, res: any) => {
  try {
    const { templateId } = req.params;
    const { title, description, questions } = req.body;
    const userId = req.user?.id;

    // Update template basic info
    await executeQuery(
      'UPDATE interview_templates SET title = ?, description = ?, updated_at = CURRENT_TIMESTAMP() WHERE id = ? AND created_by = ?',
      [title, description, templateId, userId]
    );

    // Delete existing questions
    await executeQuery('DELETE FROM interview_questions WHERE template_id = ?', [templateId]);

    // Add updated questions
    for (let i = 0; i < questions.length; i++) {
      await InterviewModel.addQuestion({
        template_id: templateId,
        question_text: questions[i].text,
        time_limit: questions[i].timeLimit,
        question_order: i + 1
      });
    }

    res.json({ message: 'Template updated successfully' });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Create interview session (send to candidate)
// Update this section in backend/src/routes/admin.ts

// Create interview session (send to candidate)
router.post('/templates/:templateId/sessions', async (req: any, res: any) => {
  try {
    const { templateId } = req.params;
    const { candidateEmail, candidateName } = req.body;

    console.log('=== EMAIL DEBUG ===');
    console.log('Gmail User exists:', !!process.env.GMAIL_USER);
    console.log('Gmail Password exists:', !!process.env.GMAIL_APP_PASSWORD);
    console.log('From Email:', process.env.FROM_EMAIL);
    console.log('From Name:', process.env.FROM_NAME);
    console.log('Target Email:', candidateEmail);

    if (!candidateEmail || !candidateName) {
      return res.status(400).json({ error: 'Candidate email and name are required' });
    }

    // Get template details for email
    const template = await InterviewModel.getTemplateById(templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const session = await InterviewModel.createSession({
      template_id: templateId,
      candidate_email: candidateEmail,
      candidate_name: candidateName
    });

    const interviewLink = `${process.env.FRONTEND_URL}/interview/${session.id}`;

    console.log('About to send email with Gmail...');
    
    // Send email using Gmail
    const emailSent = await EmailService.sendInterviewInvitation({
      to: candidateEmail,
      candidateName: candidateName,
      interviewTitle: template.title,
      interviewLink: interviewLink,
      expiresAt: session.expires_at,
      recruiterName: `${req.user?.first_name} ${req.user?.last_name}`
    });

    console.log('Email sent result:', emailSent);
    
    res.status(201).json({
      message: 'Interview session created successfully',
      session,
      interviewLink,
      emailSent: emailSent,
      // Always include the link for manual sharing if email fails
      manualLink: emailSent ? null : `Copy this link to send manually: ${interviewLink}`
    });

  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all candidate sessions for review
router.get('/sessions', async (req: any, res: any) => {
  try {
    const query = `
SELECT 
  s.id,
  s.template_id,
  s.candidate_email,
  s.candidate_name,
  s.status,
  s.started_at,
  s.completed_at,
  s.expires_at,
  s.created_at,
  t.title as interview_title,
  t.description as interview_description,
  COALESCE(v.videos_submitted, 0) as videos_submitted,
  COALESCE(q.total_questions, 0) as total_questions
FROM interview_sessions s
JOIN interview_templates t ON s.template_id = t.id
LEFT JOIN (
  -- Subquery to count videos per session
  SELECT 
    session_id, 
    COUNT(*) as videos_submitted 
  FROM video_responses 
  WHERE upload_status = 'completed'
  GROUP BY session_id
) v ON s.id = v.session_id
LEFT JOIN (
  -- Subquery to count questions per template
  SELECT 
    template_id, 
    COUNT(*) as total_questions 
  FROM interview_questions 
  GROUP BY template_id
) q ON t.id = q.template_id
ORDER BY s.created_at DESC;
    `;
    
    const rows = await executeQuery(query);
    
    const sessions = rows.map(row => ({
      id: row.ID,
      templateId: row.TEMPLATE_ID,
      candidateEmail: row.CANDIDATE_EMAIL,
      candidateName: row.CANDIDATE_NAME,
      status: row.STATUS,
      startedAt: row.STARTED_AT,
      completedAt: row.COMPLETED_AT,
      expiresAt: row.EXPIRES_AT,
      createdAt: row.CREATED_AT,
      interviewTitle: row.INTERVIEW_TITLE,
      interviewDescription: row.INTERVIEW_DESCRIPTION,
      videosSubmitted: row.VIDEOS_SUBMITTED || 0,
      totalQuestions: row.TOTAL_QUESTIONS || 0
    }));
    
    res.json(sessions);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific session with videos for review
router.get('/sessions/:sessionId/review', async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;
    
    // Get session info
    const sessionQuery = `
      SELECT s.*, t.title as interview_title, t.description as interview_description
      FROM interview_sessions s
      JOIN interview_templates t ON s.template_id = t.id
      WHERE s.id = ?
    `;
    const sessionRows = await executeQuery(sessionQuery, [sessionId]);
    
    if (sessionRows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Get questions and videos
    const videosQuery = `
      SELECT 
        q.id as question_id,
        q.question_text,
        q.time_limit,
        q.question_order,
        vr.id as video_id,
        vr.file_name,
        vr.stage_path,
        vr.file_size_bytes,
        vr.upload_status,
        vr.created_at as video_created_at
      FROM interview_questions q
      LEFT JOIN video_responses vr ON q.id = vr.question_id AND vr.session_id = ?
      WHERE q.template_id = ?
      ORDER BY q.question_order
    `;
    
    const session = sessionRows[0];
    const videoRows = await executeQuery(videosQuery, [sessionId, session.TEMPLATE_ID]);
    
    const questionsWithVideos = videoRows.map(row => ({
      questionId: row.QUESTION_ID,
      questionText: row.QUESTION_TEXT,
      timeLimit: row.TIME_LIMIT,
      questionOrder: row.QUESTION_ORDER,
      video: row.VIDEO_ID ? {
        id: row.VIDEO_ID,
        fileName: row.FILE_NAME,
        stagePath: row.STAGE_PATH,
        fileSize: row.FILE_SIZE_BYTES,
        uploadStatus: row.UPLOAD_STATUS,
        createdAt: row.VIDEO_CREATED_AT
      } : null
    }));
    
    res.json({
      session: {
        id: session.ID,
        templateId: session.TEMPLATE_ID,
        candidateEmail: session.CANDIDATE_EMAIL,
        candidateName: session.CANDIDATE_NAME,
        status: session.STATUS,
        startedAt: session.STARTED_AT,
        completedAt: session.COMPLETED_AT,
        createdAt: session.CREATED_AT,
        interviewTitle: session.INTERVIEW_TITLE,
        interviewDescription: session.INTERVIEW_DESCRIPTION
      },
      questions: questionsWithVideos
    });
    
  } catch (error) {
    console.error('Get session review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save or update evaluation for a specific question
router.post('/sessions/:sessionId/questions/:questionId/evaluation', async (req: any, res: any) => {
  try {
    const { sessionId, questionId } = req.params;
    const { rating, notes } = req.body;
    const userId = req.user?.id;

    // Validation
    if (rating !== null && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const evaluation = await EvaluationModel.saveEvaluation({
      session_id: sessionId,
      question_id: questionId,
      rating: rating || null,
      notes: notes || '',
      evaluated_by: userId
    });

    res.json({
      message: 'Evaluation saved successfully',
      evaluation
    });

  } catch (error) {
    console.error('Save evaluation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get evaluation for a specific question
router.get('/sessions/:sessionId/questions/:questionId/evaluation', async (req: any, res: any) => {
  try {
    const { sessionId, questionId } = req.params;
    
    const evaluation = await EvaluationModel.getEvaluation(sessionId, questionId);
    
    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    res.json(evaluation);

  } catch (error) {
    console.error('Get evaluation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all evaluations for a session
router.get('/sessions/:sessionId/evaluations', async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;
    
    const evaluations = await EvaluationModel.getSessionEvaluations(sessionId);
    const averageRating = await EvaluationModel.getAverageRating(sessionId);
    
    res.json({
      evaluations,
      averageRating
    });

  } catch (error) {
    console.error('Get session evaluations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get keywords for a template
router.get('/templates/:templateId/keywords', async (req: any, res: any) => {
  try {
    const { templateId } = req.params;
    
    const keywords = await KeywordModel.getKeywordsByTemplate(templateId);
    
    res.json({
      keywords,
      total: keywords.length
    });
  } catch (error) {
    console.error('Get keywords error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create/Update keywords for a template
router.post('/templates/:templateId/keywords', async (req: any, res: any) => {
  try {
    const { templateId } = req.params;
    const { keywords } = req.body;
    const userId = req.user?.id;

    if (!keywords || !Array.isArray(keywords)) {
      return res.status(400).json({ error: 'Keywords array is required' });
    }

    // Validate keywords
    for (const keyword of keywords) {
      if (!keyword.keyword || typeof keyword.keyword !== 'string') {
        return res.status(400).json({ error: 'Each keyword must have a text value' });
      }
      if (!keyword.category) {
        keyword.category = 'general';
      }
      if (!keyword.weight) {
        keyword.weight = 1.0;
      }
    }

    // Update keywords (replace all existing)
    const updatedKeywords = await KeywordModel.updateTemplateKeywords(
      templateId, 
      keywords, 
      userId
    );

    res.json({
      message: 'Keywords updated successfully',
      keywords: updatedKeywords,
      total: updatedKeywords.length
    });

  } catch (error) {
    console.error('Update keywords error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a specific keyword
router.delete('/keywords/:keywordId', async (req: any, res: any) => {
  try {
    const { keywordId } = req.params;
    
    await KeywordModel.deleteKeyword(keywordId);
    
    res.json({ message: 'Keyword deleted successfully' });
  } catch (error) {
    console.error('Delete keyword error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get session keyword scores
router.get('/sessions/:sessionId/keyword-score', async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;
    
    const score = await KeywordModel.getSessionScore(sessionId);
    
    if (!score) {
      return res.status(404).json({ error: 'No keyword score found for this session' });
    }
    
    res.json(score);
  } catch (error) {
    console.error('Get keyword score error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Calculate keyword scores for a session (manual trigger)
router.post('/sessions/:sessionId/calculate-keywords', async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;
    
    const score = await KeywordModel.calculateKeywordMatches(sessionId);
    
    if (!score) {
      return res.status(400).json({ 
        error: 'Unable to calculate scores. Ensure the session has transcripts and template has keywords.' 
      });
    }
    
    res.json({
      message: 'Keyword scores calculated successfully',
      score
    });
  } catch (error) {
    console.error('Calculate keyword scores error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get transcript and keyword matches for a specific question
router.get('/sessions/:sessionId/questions/:questionId/transcript', async (req: any, res: any) => {
  try {
    const { sessionId, questionId } = req.params;
    
    // Get video response to find transcript
    const videoQuery = 'SELECT * FROM video_responses WHERE session_id = ? AND question_id = ?';
    const videoRows = await executeQuery(videoQuery, [sessionId, questionId]);
    
    if (videoRows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const videoId = videoRows[0].ID;
    
    // Get transcript
    const transcriptQuery = 'SELECT * FROM video_transcripts WHERE video_response_id = ?';
    const transcriptRows = await executeQuery(transcriptQuery, [videoId]);
    
    if (transcriptRows.length === 0) {
      return res.json({
        transcript: null,
        keywordMatches: [],
        message: 'Transcript not available - may still be processing'
      });
    }

    const transcript = transcriptRows[0];
    
    // Get template keywords for this session
    const templateQuery = 'SELECT template_id FROM interview_sessions WHERE id = ?';
    const templateRows = await executeQuery(templateQuery, [sessionId]);
    
    if (templateRows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const templateId = templateRows[0].TEMPLATE_ID;
    
    // Get all keywords for this template
    const keywordsQuery = 'SELECT * FROM template_keywords WHERE template_id = ?';
    const keywordRows = await executeQuery(keywordsQuery, [templateId]);
    
    // Find keyword matches in transcript
    const transcriptText = transcript.TRANSCRIPT_TEXT.toLowerCase();
    const keywordMatches: any[] = [];
    
    keywordRows.forEach((keywordRow: any) => {
      const keyword = keywordRow.KEYWORD.toLowerCase();
      const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = (transcriptText.match(keywordRegex) || []);
      
      if (matches.length > 0) {
        keywordMatches.push({
          keyword: keywordRow.KEYWORD,
          category: keywordRow.CATEGORY,
          weight: keywordRow.WEIGHT,
          matchCount: matches.length,
          positions: [] // We can add position tracking later if needed
        });
      }
    });

    res.json({
      transcript: {
        id: transcript.ID,
        text: transcript.TRANSCRIPT_TEXT,
        confidence: transcript.CONFIDENCE_SCORE,
        wordCount: transcript.WORD_COUNT,
        processingStatus: transcript.PROCESSING_STATUS,
        createdAt: transcript.CREATED_AT
      },
      keywordMatches,
      totalKeywords: keywordRows.length,
      matchedKeywords: keywordMatches.length
    });

  } catch (error) {
    console.error('Get transcript error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get overall session keyword summary
router.get('/sessions/:sessionId/keyword-summary', async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;
    
    // Get session keyword score if it exists
    const scoreQuery = 'SELECT * FROM session_keyword_scores WHERE session_id = ? ORDER BY updated_at DESC LIMIT 1';
    const scoreRows = await executeQuery(scoreQuery, [sessionId]);
    
    // Get all transcripts for this session
    const transcriptsQuery = `
      SELECT vt.*, vr.question_id 
      FROM video_transcripts vt
      JOIN video_responses vr ON vt.video_response_id = vr.id
      WHERE vt.session_id = ?
    `;
    const transcriptRows = await executeQuery(transcriptsQuery, [sessionId]);
    
    // Get template info
    const templateQuery = `
      SELECT t.*, s.template_id
      FROM interview_sessions s
      JOIN interview_templates t ON s.template_id = t.id
      WHERE s.id = ?
    `;
    const templateRows = await executeQuery(templateQuery, [sessionId]);
    
    if (templateRows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const template = templateRows[0];
    
    // Get all keywords for this template
    const keywordsQuery = 'SELECT * FROM template_keywords WHERE template_id = ?';
    const keywordRows = await executeQuery(keywordsQuery, [template.TEMPLATE_ID]);
    
    // Calculate summary stats
    const summary = {
      sessionId,
      templateTitle: template.TITLE,
      totalQuestions: transcriptRows.length,
      totalKeywords: keywordRows.length,
      overallScore: scoreRows.length > 0 ? scoreRows[0].OVERALL_SCORE : null,
      technicalScore: scoreRows.length > 0 ? scoreRows[0].TECHNICAL_SCORE : null,
      softSkillsScore: scoreRows.length > 0 ? scoreRows[0].SOFT_SKILLS_SCORE : null,
      experienceScore: scoreRows.length > 0 ? scoreRows[0].EXPERIENCE_SCORE : null,
      lastCalculated: scoreRows.length > 0 ? scoreRows[0].UPDATED_AT : null,
      transcriptionStatus: transcriptRows.every(t => t.PROCESSING_STATUS === 'completed') ? 'completed' : 'processing'
    };

    res.json(summary);

  } catch (error) {
    console.error('Get keyword summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add this debug route to admin.ts
router.get('/debug-users', async (req: any, res: any) => {
  try {
    const templates = await executeQuery('SELECT DISTINCT created_by FROM interview_templates');
    const users = await executeQuery('SELECT id, email FROM users LIMIT 10');
    
    res.json({
      templateCreators: templates,
      existingUsers: users
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});


export default router;