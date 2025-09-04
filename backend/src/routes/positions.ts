import express from 'express';
import { PositionModel } from '../models/Position';
import { InterviewModel } from '../models/Interview';
import { EmailService } from '../services/emailService';

const router = express.Router();

// Test route
router.get('/test', (req: any, res: any) => {
  res.json({ message: 'Position routes working!', user: req.user });
});

// Get all positions for the authenticated user
router.get('/', async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    const positions = await PositionModel.getPositionsByUser(userId);
    
    res.json(positions);
  } catch (error) {
    console.error('Get positions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new position from template
router.post('/', async (req: any, res: any) => {
  try {
    const { title, description, template_id } = req.body;
    const userId = req.user?.id;

    if (!title || !template_id) {
      return res.status(400).json({ error: 'Title and template ID are required' });
    }

    // Verify template exists
    const template = await InterviewModel.getTemplateById(template_id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Create position from template
    const position = await PositionModel.createFromTemplate({
      title,
      description: description || '',
      template_id,
      created_by: userId
    });

    res.status(201).json({
      message: 'Position created successfully',
      position
    });

  } catch (error) {
    console.error('Create position error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific position with questions and keywords
router.get('/:positionId', async (req: any, res: any) => {
  try {
    const { positionId } = req.params;
    
    const positionDetail = await PositionModel.getPositionDetail(positionId);
    if (!positionDetail) {
      return res.status(404).json({ error: 'Position not found' });
    }

    res.json(positionDetail);
  } catch (error) {
    console.error('Get position detail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update position basic info
router.put('/:positionId', async (req: any, res: any) => {
  try {
    const { positionId } = req.params;
    const { title, description, questions, keywords } = req.body;

    // Update basic position info
    if (title !== undefined || description !== undefined) {
      await PositionModel.updatePosition(positionId, { title, description });
    }

    // Update questions if provided
    if (questions && Array.isArray(questions)) {
      const validQuestions = questions.filter(q => q.text && q.text.trim() !== '');
      if (validQuestions.length === 0) {
        return res.status(400).json({ error: 'At least one question is required' });
      }
      
      await PositionModel.updatePositionQuestions(positionId, validQuestions);
    }

    // Update keywords if provided
    if (keywords && Array.isArray(keywords)) {
      await PositionModel.updatePositionKeywords(positionId, keywords);
    }

    res.json({ message: 'Position updated successfully' });
  } catch (error) {
    console.error('Update position error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get position questions
router.get('/:positionId/questions', async (req: any, res: any) => {
  try {
    const { positionId } = req.params;
    
    const questions = await PositionModel.getPositionQuestions(positionId);
    
    res.json({ questions });
  } catch (error) {
    console.error('Get position questions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update position questions only
router.put('/:positionId/questions', async (req: any, res: any) => {
  try {
    const { positionId } = req.params;
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Questions array is required' });
    }

    const validQuestions = questions.filter(q => q.text && q.text.trim() !== '');
    if (validQuestions.length === 0) {
      return res.status(400).json({ error: 'At least one question is required' });
    }

    const updatedQuestions = await PositionModel.updatePositionQuestions(positionId, validQuestions);

    res.json({
      message: 'Position questions updated successfully',
      questions: updatedQuestions
    });
  } catch (error) {
    console.error('Update position questions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get position keywords
router.get('/:positionId/keywords', async (req: any, res: any) => {
  try {
    const { positionId } = req.params;
    
    const keywords = await PositionModel.getPositionKeywords(positionId);
    
    res.json({ 
      keywords,
      total: keywords.length
    });
  } catch (error) {
    console.error('Get position keywords error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update position keywords only
router.put('/:positionId/keywords', async (req: any, res: any) => {
  try {
    const { positionId } = req.params;
    const { keywords } = req.body;

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

    const updatedKeywords = await PositionModel.updatePositionKeywords(positionId, keywords);

    res.json({
      message: 'Position keywords updated successfully',
      keywords: updatedKeywords,
      total: updatedKeywords.length
    });

  } catch (error) {
    console.error('Update position keywords error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create interview session from position (send to candidate)
router.post('/:positionId/sessions', async (req: any, res: any) => {
  try {
    const { positionId } = req.params;
    const { candidateEmail, candidateName } = req.body;

    console.log('=== POSITION SESSION EMAIL DEBUG ===');
    console.log('Position ID:', positionId);
    console.log('Target Email:', candidateEmail);

    if (!candidateEmail || !candidateName) {
      return res.status(400).json({ error: 'Candidate email and name are required' });
    }

    // Get position details
    const position = await PositionModel.getPositionById(positionId);
    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }

    // Create session linked to position
    const session = await InterviewModel.createSession({
      template_id: position.template_id, // Keep template_id for backward compatibility
      candidate_email: candidateEmail,
      candidate_name: candidateName
    });

    // Update session with position_id
    await PositionModel.linkSessionToPosition(session.id, positionId);

    const interviewLink = `${process.env.FRONTEND_URL}/interview/${session.id}`;

    // Send email with position title
    const emailSent = await EmailService.sendInterviewInvitation({
      to: candidateEmail,
      candidateName: candidateName,
      interviewTitle: position.title,
      interviewLink: interviewLink,
      expiresAt: session.expires_at,
      recruiterName: `${req.user?.first_name} ${req.user?.last_name}`
    });

    console.log('Position session email sent result:', emailSent);
    
    res.status(201).json({
      message: 'Interview session created successfully',
      session,
      position,
      interviewLink,
      emailSent: emailSent
    });

  } catch (error) {
    console.error('Create position session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get sessions for a specific position
router.get('/:positionId/sessions', async (req: any, res: any) => {
  try {
    const { positionId } = req.params;
    
    const sessions = await PositionModel.getPositionSessions(positionId);
    
    res.json({ sessions });
  } catch (error) {
    console.error('Get position sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete position
router.delete('/:positionId', async (req: any, res: any) => {
  try {
    const { positionId } = req.params;
    
    // Check if position has any active sessions
    const sessions = await PositionModel.getPositionSessions(positionId);
    if (sessions.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete position with existing candidate sessions',
        sessionsCount: sessions.length
      });
    }

    await PositionModel.deletePosition(positionId);
    
    res.json({ message: 'Position deleted successfully' });
  } catch (error) {
    console.error('Delete position error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;