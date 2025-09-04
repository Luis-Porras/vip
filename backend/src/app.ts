// backend/src/app.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth';
import interviewRoutes from './routes/interviews';
import adminRoutes from './routes/admin';
import uploadRoutes from './routes/upload';
import videoRoutes from './routes/video'; 
import { R2Service } from './services/r2Service';

// Import middleware
import { authMiddleware } from './middleware/auth';
import positionRoutes from './routes/positions';

dotenv.config();

const app = express();

// Basic middleware
app.use(express.json());
app.use(cors());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', message: 'Server is working!' });
});

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/video', videoRoutes); // Add this line

// Protected routes (require authentication)
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/admin/positions', authMiddleware, positionRoutes);


export default app;