// backend/src/models/User.ts
import { executeQuery } from '../config/snowflake';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class UserModel {
  static async create(userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role?: string;
  }): Promise<User> {
    const id = uuidv4();
    const password_hash = await bcrypt.hash(userData.password, 10);
    
    const query = `
      INSERT INTO users (id, email, password_hash, first_name, last_name, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    await executeQuery(query, [
      id,
      userData.email,
      password_hash,
      userData.first_name,
      userData.last_name,
      userData.role || 'recruiter'
    ]);

    return this.findById(id);
  }

  static async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = ? AND is_active = true';
    const rows = await executeQuery(query, [email]);
    
    if (rows.length === 0) return null;
    
    // Convert Snowflake uppercase columns to lowercase
    const row = rows[0];
    return {
      id: row.ID,
      email: row.EMAIL,
      password_hash: row.PASSWORD_HASH,
      first_name: row.FIRST_NAME,
      last_name: row.LAST_NAME,
      role: row.ROLE,
      is_active: row.IS_ACTIVE,
      created_at: row.CREATED_AT,
      updated_at: row.UPDATED_AT
    };
  }

  static async findById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = ? AND is_active = true';
    const rows = await executeQuery(query, [id]);
    
    if (rows.length === 0) return null;
    
    // Convert Snowflake uppercase columns to lowercase
    const row = rows[0];
    return {
      id: row.ID,
      email: row.EMAIL,
      password_hash: row.PASSWORD_HASH,
      first_name: row.FIRST_NAME,
      last_name: row.LAST_NAME,
      role: row.ROLE,
      is_active: row.IS_ACTIVE,
      created_at: row.CREATED_AT,
      updated_at: row.UPDATED_AT
    };
  }

  static async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password_hash);
  }

  static async updateLastLogin(id: string): Promise<void> {
    const query = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP() WHERE id = ?';
    await executeQuery(query, [id]);
  }
}

