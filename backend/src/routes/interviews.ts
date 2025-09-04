// backend/src/routes/interviews.ts
import express from 'express';
import { InterviewModel } from '../models/Interview';
import { ProgressModel } from '../models/Progress';

const router = express.Router();

// Test route
router.get('/test', (req: any, res: any) => {
  res.json({ message: 'Interview routes working!' });
});

// Get question progress
router.get('/session/:sessionId/question/:questionId/progress', async (req: any, res: any) => {
  try {
    const { sessionId, questionId } = req.params;
    
    const progress = await ProgressModel.getQuestionProgress(sessionId, questionId);
    const canRetake = await ProgressModel.canRetake(sessionId, questionId);
    
    res.json({
      progress,
      canRetake,
      attemptsUsed: progress?.attempts_used || 0,
      isCompleted: progress?.is_completed || false
    });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record attempt (when user starts recording)

router.post('/session/:sessionId/question/:questionId/attempt', async (req: any, res: any) => {
  try {
    const { sessionId, questionId } = req.params;
    
    // Initialize progress if doesn't exist
    await ProgressModel.initializeQuestionProgress(sessionId, questionId);
    
    // Record the attempt
    await ProgressModel.recordAttempt(sessionId, questionId);
    
    res.json({ message: 'Attempt recorded' });
  } catch (error) {
    console.error('Record attempt error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete question (when user submits final answer)
router.post('/session/:sessionId/question/:questionId/complete', async (req: any, res: any) => {
  try {
    const { sessionId, questionId } = req.params;
    
    await ProgressModel.markQuestionCompleted(sessionId, questionId);
    
    res.json({ message: 'Question completed successfully' });
  } catch (error) {
    console.error('Complete question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get interview by session ID (for candidates)
router.get('/session/:sessionId', async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;
    
    const session = await InterviewModel.getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    // Check if session is expired
    if (new Date() > new Date(session.expires_at)) {
      return res.status(410).json({ error: 'Interview session has expired' });
    }

    // Get template and questions
    const template = await InterviewModel.getTemplateById(session.template_id);
    const questions = await InterviewModel.getQuestionsByTemplate(session.template_id);

    res.json({
      session,
      template,
      questions
    });
  } catch (error) {
    console.error('Get interview session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start interview session
router.post('/session/:sessionId/start', async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;
    
    await InterviewModel.updateSessionStatus(sessionId, 'in_progress');
    
    res.json({ message: 'Interview started successfully' });
  } catch (error) {
    console.error('Start interview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete interview session
router.post('/session/:sessionId/complete', async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;
    
    await InterviewModel.updateSessionStatus(sessionId, 'completed');
    
    res.json({ message: 'Interview completed successfully' });
  } catch (error) {
    console.error('Complete interview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;