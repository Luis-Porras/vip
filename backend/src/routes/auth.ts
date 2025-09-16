// backend/src/routes/auth.ts
import express from 'express';

console.log('🔥 AUTH ROUTES FILE LOADED');

const router = express.Router();

router.get('/test', (req: any, res: any) => {
  console.log('AUTH TEST ROUTE HIT');
  res.json({ message: 'Auth routes working!' });
});

router.post('/test', (req: any, res: any) => {
  console.log('POST TEST ROUTE HIT:', req.body);
  res.json({ message: 'POST test works' });
});

export default router;