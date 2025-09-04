//backend/src/config/snowflake.ts
import snowflake from 'snowflake-sdk';

console.log('Snowflake config:', {
  account: process.env.SNOWFLAKE_ACCOUNT,
  username: process.env.SNOWFLAKE_USERNAME,
  database: process.env.SNOWFLAKE_DATABASE
});

const connection = snowflake.createConnection({
  account: process.env.SNOWFLAKE_ACCOUNT!,
  username: process.env.SNOWFLAKE_USERNAME!,
  password: process.env.SNOWFLAKE_PASSWORD!,
  database: process.env.SNOWFLAKE_DATABASE || 'VIDEO_INTERVIEWS',
  schema: process.env.SNOWFLAKE_SCHEMA || 'MAIN',
  warehouse: process.env.SNOWFLAKE_WAREHOUSE || 'COMPUTE_WH',
});

// Connect to Snowflake
export const connectToSnowflake = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    connection.connect((err, conn) => {
      if (err) {
        console.error('Unable to connect to Snowflake:', err.message);
        reject(err);
      } else {
        console.log('✅ Successfully connected to Snowflake');
        resolve();
      }
    });
  });
};

// Execute query helper
export const executeQuery = (sqlText: string, binds: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText,
      binds,
      complete: (err, stmt, rows) => {
        if (err) {
          console.error('Failed to execute statement:', err.message);
          reject(err);
        } else {
          resolve(rows || []);
        }
      },
    });
  });
};

export default connection;

