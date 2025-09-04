// backend/src/server.ts
import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectToSnowflake } from './config/snowflake';
import { TempFileManager } from './utils/tempFileCleanup'; // 👈 ADD THIS IMPORT

const PORT = process.env.PORT || 5000;

// Connect to Snowflake first, then start server
const startServer = async () => {
  try {
    await connectToSnowflake();
    
    // 👇 ADD THIS SECTION HERE 👇
    // Start periodic temp file cleanup
    TempFileManager.startPeriodicCleanup(15); // Every 15 minutes
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🧹 Temp file cleanup running every 15 minutes`); // 👈 ADD THIS LOG
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();