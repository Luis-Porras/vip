// backend/src/utils/tempFileCleanup.ts
import fs from 'fs';
import path from 'path';

export class TempFileManager {
  private static tempDirs = ['./temp_downloads', './temp_audio', './uploads'];
  
  // Clean up files older than specified minutes
  static cleanupOldFiles(maxAgeMinutes: number = 30): void {
    const maxAgeMs = maxAgeMinutes * 60 * 1000;
    const now = Date.now();
    
    this.tempDirs.forEach(dirPath => {
      if (!fs.existsSync(dirPath)) return;
      
      try {
        const files = fs.readdirSync(dirPath);
        let deletedCount = 0;
        
        files.forEach(file => {
          const filePath = path.join(dirPath, file);
          try {
            const stats = fs.statSync(filePath);
            const fileAge = now - stats.mtime.getTime();
            
            if (fileAge > maxAgeMs) {
              fs.unlinkSync(filePath);
              deletedCount++;
              console.log(`🗑️ Deleted old temp file: ${filePath}`);
            }
          } catch (error) {
            console.error(`Error processing file ${filePath}:`, error);
          }
        });
        
        if (deletedCount > 0) {
          console.log(`✅ Cleaned up ${deletedCount} old files from ${dirPath}`);
        }
      } catch (error) {
        console.error(`Error cleaning directory ${dirPath}:`, error);
      }
    });
  }
  
  // Force delete specific files with retry
  static async forceDeleteFile(filePath: string, maxRetries: number = 3): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Successfully deleted: ${filePath}`);
          return true;
        }
        return true; // File doesn't exist, consider it "deleted"
      } catch (error) {
        console.error(`Attempt ${attempt} failed to delete ${filePath}:`, error);
        if (attempt < maxRetries) {
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    console.error(`❌ Failed to delete ${filePath} after ${maxRetries} attempts`);
    return false;
  }
  
  // Schedule periodic cleanup
  static startPeriodicCleanup(intervalMinutes: number = 15): NodeJS.Timeout {
    console.log(`🕒 Starting periodic temp file cleanup every ${intervalMinutes} minutes`);
    
    // Run cleanup immediately
    this.cleanupOldFiles();
    
    // Schedule regular cleanup
    return setInterval(() => {
      console.log('🧹 Running scheduled temp file cleanup...');
      this.cleanupOldFiles();
    }, intervalMinutes * 60 * 1000);
  }
}