import { pool } from '../config/database';
import bcrypt from 'bcryptjs';

export interface User {
  id: number;
  username: string;
  email: string;
  display_name?: string;
  bio?: string;
  is_verified: boolean;
  privacy_settings: any;
  subscription_tier: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  display_name?: string;
}

export class UserModel {
  static async create(userData: CreateUserData): Promise<User> {
    const { username, email, password, display_name } = userData;
    
    // Hash password
    const password_hash = await bcrypt.hash(password, 12);
    
    const query = `
      INSERT INTO users (username, email, password_hash, display_name)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, email, display_name, is_verified, privacy_settings, 
                subscription_tier, created_at, updated_at
    `;
    
    const result = await pool.query(query, [username, email, password_hash, display_name]);
    return result.rows[0];
  }

  static async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, username, email, display_name, is_verified, privacy_settings, 
             subscription_tier, created_at, updated_at
      FROM users WHERE email = $1
    `;
    
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  static async findByUsername(username: string): Promise<User | null> {
    const query = `
      SELECT id, username, email, display_name, is_verified, privacy_settings, 
             subscription_tier, created_at, updated_at
      FROM users WHERE username = $1
    `;
    
    const result = await pool.query(query, [username]);
    return result.rows[0] || null;
  }

  static async findById(id: number): Promise<User | null> {
    const query = `
      SELECT id, username, email, display_name, is_verified, privacy_settings, 
             subscription_tier, created_at, updated_at
      FROM users WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async verifyPassword(email: string, password: string): Promise<User | null> {
    const query = `
      SELECT id, username, email, password_hash, display_name, is_verified, 
             privacy_settings, subscription_tier, created_at, updated_at
      FROM users WHERE email = $1
    `;
    
    const result = await pool.query(query, [email]);
    if (!result.rows[0]) return null;
    
    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) return null;
    
    // Remove password_hash from returned user
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static async updateProfile(id: number, updates: Partial<CreateUserData>): Promise<User | null> {
    const allowedFields = ['username', 'email', 'display_name', 'bio'];
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(id);
    const query = `
      UPDATE users 
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING id, username, email, display_name, is_verified, privacy_settings, 
                subscription_tier, created_at, updated_at
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }
}