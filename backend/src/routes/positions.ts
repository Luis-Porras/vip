// backend/src/routes/positions.ts - Simplified version to isolate the error
import express from 'express';

const router = express.Router();

// Test route
router.get('/test', (req: any, res: any) => {
  console.log('Position test route hit');
  res.json({ message: 'Position routes working!', user: req.user });
});

// Basic routes to test
router.get('/', (req: any, res: any) => {
  console.log('Get positions route hit');
  res.json({ message: 'Get positions - simplified', positions: [] });
});

router.post('/', (req: any, res: any) => {
  console.log('Create position route hit');
  res.json({ message: 'Create position - simplified' });
});

// Comment out all the complex routes for now to isolate the issue
/*
router.get('/:positionId', async (req: any, res: any) => {
  // ... your existing code
});

router.put('/:positionId', async (req: any, res: any) => {
  // ... your existing code  
});

router.get('/:positionId/questions', async (req: any, res: any) => {
  // ... your existing code
});

router.put('/:positionId/questions', async (req: any, res: any) => {
  // ... your existing code
});

router.get('/:positionId/keywords', async (req: any, res: any) => {
  // ... your existing code
});

router.put('/:positionId/keywords', async (req: any, res: any) => {
  // ... your existing code
});

router.post('/:positionId/sessions', async (req: any, res: any) => {
  // ... your existing code
});

router.get('/:positionId/sessions', async (req: any, res: any) => {
  // ... your existing code
});

router.delete('/:positionId', async (req: any, res: any) => {
  // ... your existing code
});
*/

console.log('Position routes loaded successfully');

export default router;