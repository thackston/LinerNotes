import express, { Request, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { validateFavorite } from '../middleware/validation';
import { UserModel } from '../models/User';
import { FavoritesModel } from '../models/Favorites';

const router = express.Router();

// GET /api/users/profile
router.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get full user profile from database
    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's favorites count
    const favorites = await FavoritesModel.getByUserId(req.user.id);
    const favoritesByType = await FavoritesModel.getFavoritesByType(req.user.id);
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        display_name: user.display_name,
        bio: user.bio,
        subscription_tier: user.subscription_tier,
        created_at: user.created_at,
        favorites_count: favorites.length,
        favorites_by_type: Object.keys(favoritesByType).reduce((acc, key) => {
          acc[key] = favoritesByType[key].length;
          return acc;
        }, {} as Record<string, number>)
      }
    });
    
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users/favorites
router.post('/favorites', authenticateToken, validateFavorite, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { type, itemId, itemData } = req.body;
    
    // Save favorite to database
    const favorite = await FavoritesModel.create({
      user_id: req.user.id,
      item_type: type,
      item_id: itemId,
      item_data: itemData
    });
    
    res.status(201).json({
      message: 'Added to favorites',
      favorite: {
        id: favorite.id,
        type: favorite.item_type,
        itemId: favorite.item_id,
        itemData: favorite.item_data,
        created_at: favorite.created_at
      }
    });
    
  } catch (error) {
    console.error('Favorites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/favorites - Get user's favorites
router.get('/favorites', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { type } = req.query;
    const favorites = await FavoritesModel.getByUserId(req.user.id, type as string);
    
    res.json({
      favorites: favorites.map(fav => ({
        id: fav.id,
        type: fav.item_type,
        itemId: fav.item_id,
        itemData: fav.item_data,
        created_at: fav.created_at
      }))
    });
    
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/users/favorites/:type/:itemId - Remove from favorites
router.delete('/favorites/:type/:itemId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { type, itemId } = req.params;
    const removed = await FavoritesModel.remove(req.user.id, type, itemId);
    
    if (!removed) {
      return res.status(404).json({ error: 'Favorite not found' });
    }
    
    res.json({ message: 'Removed from favorites' });
    
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;