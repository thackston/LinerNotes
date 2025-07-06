import { pool } from '../config/database';

export interface Favorite {
  id: number;
  user_id: number;
  item_type: string;
  item_id: string;
  item_data: any;
  created_at: Date;
}

export interface CreateFavoriteData {
  user_id: number;
  item_type: string;
  item_id: string;
  item_data: any;
}

export class FavoritesModel {
  static async create(favoriteData: CreateFavoriteData): Promise<Favorite> {
    const { user_id, item_type, item_id, item_data } = favoriteData;
    
    const query = `
      INSERT INTO favorites (user_id, item_type, item_id, item_data)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, item_type, item_id) 
      DO UPDATE SET item_data = EXCLUDED.item_data
      RETURNING *
    `;
    
    const result = await pool.query(query, [user_id, item_type, item_id, JSON.stringify(item_data)]);
    return result.rows[0];
  }

  static async getByUserId(userId: number, itemType?: string): Promise<Favorite[]> {
    let query = 'SELECT * FROM favorites WHERE user_id = $1';
    const params: any[] = [userId];
    
    if (itemType) {
      query += ' AND item_type = $2';
      params.push(itemType);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  static async remove(userId: number, itemType: string, itemId: string): Promise<boolean> {
    const query = `
      DELETE FROM favorites 
      WHERE user_id = $1 AND item_type = $2 AND item_id = $3
    `;
    
    const result = await pool.query(query, [userId, itemType, itemId]);
    return (result.rowCount || 0) > 0;
  }

  static async isFavorite(userId: number, itemType: string, itemId: string): Promise<boolean> {
    const query = `
      SELECT 1 FROM favorites 
      WHERE user_id = $1 AND item_type = $2 AND item_id = $3
    `;
    
    const result = await pool.query(query, [userId, itemType, itemId]);
    return result.rows.length > 0;
  }

  static async getFavoritesByType(userId: number): Promise<Record<string, Favorite[]>> {
    const query = 'SELECT * FROM favorites WHERE user_id = $1 ORDER BY item_type, created_at DESC';
    const result = await pool.query(query, [userId]);
    
    const favoritesByType: Record<string, Favorite[]> = {};
    for (const favorite of result.rows) {
      if (!favoritesByType[favorite.item_type]) {
        favoritesByType[favorite.item_type] = [];
      }
      favoritesByType[favorite.item_type].push(favorite);
    }
    
    return favoritesByType;
  }
}