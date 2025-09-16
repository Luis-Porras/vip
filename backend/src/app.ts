// backend/src/app.ts
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import interviewRoutes from './routes/interviews';
import adminRoutes from './routes/admin';
import uploadRoutes from './routes/upload';
import videoRoutes from './routes/video';
import positionRoutes from './routes/positions';
import { authMiddleware } from './middleware/auth';
import jwt from 'jsonwebtoken';

const app = express();

// Basic middleware
app.use(express.json());
app.use(cors());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', message: 'Server is working!' });
});

// Test login route with correct user ID
app.post('/api/auth/test', (req: any, res: any) => {
  console.log('DIRECT ROUTE WORKED:', req.body);
  
  const { email, password } = req.body;
  
  if (email === 'test@company.com' && password === 'password123') {
    const mockUser = {
      id: 'ced6e104-7739-4711-b9ef-dd98008dc31a', // Updated to use real database user ID
      email: 'test@company.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'recruiter'
    };
    
    const token = jwt.sign(
      { id: mockUser.id, email: mockUser.email, role: mockUser.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    return res.json({
      message: 'Login successful',
      token: token,
      user: mockUser
    });
  }
  
  return res.status(400).json({ error: 'Invalid credentials' });
});

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/video', videoRoutes);

// Protected routes (require authentication)
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/admin/positions', authMiddleware, positionRoutes);

export default app;