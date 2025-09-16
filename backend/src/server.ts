import dotenv from 'dotenv';
dotenv.config();

import app from './app';  // Keep this
// Remove these lines:
// import express from 'express';
// import cors from 'cors';
// const app = express();
// app.use(cors());
// app.use(express.json());

// Remove the local route too since it's now in app.ts
// app.post('/api/auth/test', ...)

import { connectToSnowflake } from './config/snowflake';
import { TempFileManager } from './utils/tempFileCleanup';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectToSnowflake();
    TempFileManager.startPeriodicCleanup(15);
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();