import express, { Request, Response } from 'express';
import { tidalApi } from '../services/tidalApi';
import { musicBrainzApi } from '../services/musicBrainzApi';
import { validateSearchQuery, validateSongId } from '../middleware/validation';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { searchLimiter } from '../middleware/rateLimiting';

const router = express.Router();

// Apply search-specific rate limiting to all search routes
router.use(searchLimiter);

// GET /api/search/songs
router.get('/songs', optionalAuth, validateSearchQuery, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { q, limit = 20 } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Search using TIDAL API (mock implementation)
    const tidalResults = await tidalApi.searchSongs(q, parseInt(limit as string));
    
    // Also search MusicBrainz for additional metadata
    const mbResults = await musicBrainzApi.searchRecordings(q, 10);

    // Combine and format results
    const combinedResults = {
      primary: tidalResults,
      supplementary: mbResults,
      total: tidalResults.length + mbResults.length
    };

    res.json({
      query: q,
      results: combinedResults,
      source: 'tidal+musicbrainz'
    });
    
  } catch (error) {
    console.error('Song search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/search/artists
router.get('/artists', optionalAuth, validateSearchQuery, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { q, limit = 20 } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Search using both APIs
    const tidalResults = await tidalApi.searchArtists(q, parseInt(limit as string));
    const mbResults = await musicBrainzApi.searchArtists(q, 10);

    res.json({
      query: q,
      results: {
        primary: tidalResults,
        supplementary: mbResults,
        total: tidalResults.length + mbResults.length
      },
      source: 'tidal+musicbrainz'
    });
    
  } catch (error) {
    console.error('Artist search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/search/albums
router.get('/albums', optionalAuth, validateSearchQuery, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { q, limit = 20 } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Search using both APIs
    const tidalResults = await tidalApi.searchAlbums(q, parseInt(limit as string));
    const mbResults = await musicBrainzApi.searchReleases(q, 10);

    res.json({
      query: q,
      results: {
        primary: tidalResults,
        supplementary: mbResults,
        total: tidalResults.length + mbResults.length
      },
      source: 'tidal+musicbrainz'
    });
    
  } catch (error) {
    console.error('Album search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/search/people - Search for musicians, producers, songwriters, etc.
router.get('/people', optionalAuth, validateSearchQuery, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { q, role, limit = 20 } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Search for people using TIDAL API
    const tidalResults = await tidalApi.searchPerson(q, role as string);
    
    // Also search MusicBrainz for artist information
    const mbResults = await musicBrainzApi.searchArtists(q, 10);

    res.json({
      query: q,
      role: role || 'all',
      results: {
        primary: tidalResults,
        supplementary: mbResults,
        total: tidalResults.length + mbResults.length
      },
      source: 'tidal+musicbrainz'
    });
    
  } catch (error) {
    console.error('People search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/search/song/:id - Get detailed song information
router.get('/song/:id', optionalAuth, validateSongId, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const songDetails = await tidalApi.getSongDetails(id);
    
    if (!songDetails) {
      return res.status(404).json({ error: 'Song not found' });
    }

    res.json({
      song: songDetails,
      source: 'tidal'
    });
    
  } catch (error) {
    console.error('Song details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;