import { pool } from '../config/database';

export interface SearchHistoryItem {
  id: number;
  user_id: number;
  query: string;
  search_type: string;
  results_count: number;
  created_at: Date;
}

export class SearchHistoryModel {
  static async create(
    userId: number, 
    query: string, 
    searchType: string, 
    resultsCount: number = 0
  ): Promise<SearchHistoryItem> {
    const insertQuery = `
      INSERT INTO search_history (user_id, query, search_type, results_count)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [userId, query, searchType, resultsCount]);
    return result.rows[0];
  }

  static async getByUserId(userId: number, limit: number = 50): Promise<SearchHistoryItem[]> {
    const query = `
      SELECT * FROM search_history 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;
    
    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  }

  static async deleteByUserId(userId: number): Promise<void> {
    const query = 'DELETE FROM search_history WHERE user_id = $1';
    await pool.query(query, [userId]);
  }

  static async getRecentSearches(userId: number, days: number = 30): Promise<SearchHistoryItem[]> {
    // Validate and sanitize days parameter to prevent SQL injection
    const safeDays = Math.max(1, Math.min(365, Math.floor(Math.abs(days))));
    
    const query = `
      SELECT * FROM search_history 
      WHERE user_id = $1 
        AND created_at >= NOW() - INTERVAL $2::integer DAY
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query, [userId, safeDays]);
    return result.rows;
  }
}