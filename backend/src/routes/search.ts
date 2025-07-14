import express, { Request, Response } from 'express';
import { musicBrainzApi } from '../services/musicBrainzApi';
import { musicBrainzEnhancedService } from '../services/musicAPIs/musicBrainzEnhanced';
import { discogsApi } from '../services/discogsApi';
import { validateSearchQuery, validateSongId } from '../middleware/validation';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { searchLimiter } from '../middleware/rateLimiting';

const router = express.Router();

// Apply search-specific rate limiting to all search routes
router.use(searchLimiter);

/**
 * Parse search query to extract artist and song information
 * Handles formats like:
 * - "Come Together Beatles" 
 * - "Beatles - Come Together"
 * - "artist:Beatles song:Come Together"
 * - "Come Together" (song only)
 */
function parseSearchQuery(query: string, explicitArtist?: string): {
  artist: string;
  song: string;
} {
  if (explicitArtist) {
    return { artist: explicitArtist, song: query.trim() };
  }

  // Handle "artist - song" format
  const dashMatch = query.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (dashMatch) {
    return { 
      artist: dashMatch[1].trim(), 
      song: dashMatch[2].trim() 
    };
  }

  // Handle "artist:Beatles song:Come Together" format
  const structuredMatch = query.match(/(?:artist[:\s]+([^,]+))(?:.*song[:\s]+([^,]+))?|(?:song[:\s]+([^,]+))(?:.*artist[:\s]+([^,]+))?/i);
  if (structuredMatch) {
    const artist = structuredMatch[1] || structuredMatch[4] || '';
    const song = structuredMatch[2] || structuredMatch[3] || '';
    return { 
      artist: artist.trim(), 
      song: song.trim() 
    };
  }

  // For simple queries, try to detect if last word(s) are artist names
  // Common patterns: "Come Together Beatles", "Stairway to Heaven Led Zeppelin"
  const words = query.trim().split(/\s+/);
  if (words.length >= 3) {
    // Try different combinations: last 1, 2, 3 words as artist
    const potentialArtists = [
      words.slice(-2).join(' '), // Last two words (try first for "Jackson Browne")
      words.slice(-3).join(' '), // Last three words (for "Guns N Roses")
      words.slice(-1).join(' ')  // Last word (fallback)
    ];
    
    // Check against common artist patterns
    for (const potentialArtist of potentialArtists) {
      if (isLikelyArtistName(potentialArtist)) {
        // Calculate where artist starts in the original array
        const artistWords = potentialArtist.split(' ');
        const artistStartIndex = words.length - artistWords.length;
        const song = words.slice(0, artistStartIndex).join(' ');
        
        if (song.length > 0) {
          return { artist: potentialArtist, song: song };
        }
      }
    }
  }

  // Default: treat entire query as song title, no specific artist
  return { artist: '', song: query.trim() };
}

/**
 * Check if a string is likely an artist name
 */
function isLikelyArtistName(text: string): boolean {
  const artistIndicators = [
    // Common artist name patterns
    /^the\s+/i,           // "The Beatles"
    /\s+band$/i,          // "Radiohead Band"
    /^[A-Z][a-z]+(\s+[A-Z][a-z]*)*$/, // Proper case names
    
    // Expanded known artists list
    /beatles|queen|bowie|dylan|prince|madonna|elvis|stones|zeppelin|floyd|radiohead|nirvana|metallica|u2|coldplay|eminem|taylor\s*swift|adele|beyonce|kanye|jay-z|drake|rihanna|bruno\s*mars|ed\s*sheeran|justin\s*bieber|ariana\s*grande|billie\s*eilish|jackson\s*browne|eagles|guns\s*n\s*roses|fleetwood\s*mac|john\s*lennon|paul\s*mccartney|michael\s*jackson|stevie\s*wonder|bob\s*marley/i,
    
    // Band/artist suffixes
    /\s+(band|group|orchestra|quartet|trio|duo)$/i,
    
    // Single name artists (if capitalized)
    /^[A-Z][a-z]{2,}$/,
    
    // Multiple capitalized words (likely artist names)
    /^[A-Z][a-z]*(\s+[A-Z][a-z]*)+$/
  ];
  
  return artistIndicators.some(pattern => pattern.test(text));
}

// GET /api/search/songs - Enhanced with smart prioritization and caching
router.get('/songs', optionalAuth, validateSearchQuery, async (req: AuthenticatedRequest, res: Response) => {
  const { q, song, artist, limit = 20 } = req.query;
  
  // Handle both old format (q) and new format (song + artist)
  let searchQuery: string;
  let explicitArtist: string | undefined;
  
  if (song && typeof song === 'string') {
    // New format: separate song and artist fields
    searchQuery = song;
    explicitArtist = (artist && typeof artist === 'string') ? artist : undefined;
  } else if (q && typeof q === 'string') {
    // Legacy format: combined query
    searchQuery = q;
    explicitArtist = (artist && typeof artist === 'string') ? artist : undefined;
  } else {
    return res.status(400).json({ error: 'Either "q" or "song" parameter is required' });
  }

  try {
    
    // Security: Validate query length to prevent abuse
    if (searchQuery.length > 500) {
      return res.status(400).json({ error: 'Search query too long (max 500 characters)' });
    }
    
    // Security: Validate limit parameter
    const parsedLimit = parseInt(limit as string);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return res.status(400).json({ error: 'Invalid limit parameter (1-100)' });
    }
    
    // Security: Validate artist parameter if provided
    if (explicitArtist && explicitArtist.length > 200) {
      return res.status(400).json({ error: 'Invalid artist parameter' });
    }

    console.log(`🔍 Song search request: "${searchQuery.substring(0, 100)}..." (limit: ${parsedLimit})`);
    if (explicitArtist) {
      console.log(`🎤 Explicit artist provided: "${explicitArtist}"`);
    }

    // Handle query parsing differently based on input format
    let parsedArtist: string;
    let parsedSong: string;
    
    if (explicitArtist) {
      // Use explicit fields - no parsing needed!
      parsedArtist = explicitArtist;
      parsedSong = searchQuery;
    } else {
      // Parse combined query using existing logic
      const parsed = parseSearchQuery(searchQuery);
      parsedArtist = parsed.artist;
      parsedSong = parsed.song;
    }
    
    console.log(`🎵 Parsed query - Artist: "${parsedArtist}", Song: "${parsedSong}"`);

    // Use enhanced MusicBrainz service with smart prioritization
    console.log(`🧠 Calling enhanced MusicBrainz service...`);
    const enhancedResults = await musicBrainzEnhancedService.searchWithSmartPrioritization(
      parsedArtist,
      parsedSong,
      parsedLimit
    );
    console.log(`✅ Enhanced search completed:`, {
      resultCount: enhancedResults.results.length,
      cached: enhancedResults.cached,
      searchTime: enhancedResults.searchTime
    });

    // Add supplementary Discogs results if needed (optional fallback)
    let supplementaryResults: any[] = [];
    if (enhancedResults.results.length < parsedLimit / 2) {
      console.log(`📦 Adding Discogs supplementary results (low MusicBrainz count: ${enhancedResults.results.length})`);
      try {
        const discogsLimit = Math.max(0, parsedLimit - enhancedResults.results.length);
        supplementaryResults = await discogsApi.searchReleases(searchQuery, discogsLimit);
      } catch (discogsError) {
        console.warn('⚠️ Discogs search failed, continuing with MusicBrainz only:', discogsError);
      }
    }

    // Security: Filter debug information for production
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    // Prepare enhanced response format
    const response: any = {
      // Enhanced results array (flat structure)
      results: enhancedResults.results.map(result => {
        // Security: Remove debug information in production
        if (!isDevelopment) {
          const { priorityScore, scoringReason, ...publicResult } = result;
          return publicResult;
        }
        return result;
      }),
      
      // Metadata
      query: explicitArtist ? `${parsedSong} by ${parsedArtist}` : searchQuery,
      totalCount: enhancedResults.totalCount,
      cached: enhancedResults.cached,
      
      // Source attribution
      sources: {
        musicbrainz: enhancedResults.results.length,
        discogs: supplementaryResults.length
      },
      primary_source: 'musicbrainz_enhanced'
    };
    
    // Security: Add debug information only in development
    if (isDevelopment) {
      response.parsedQuery = {
        artist: parsedArtist,
        song: parsedSong
      };
      response.searchFormat = explicitArtist ? 'separate_fields' : 'combined_query';
      response.searchTime = enhancedResults.searchTime;
      response.cacheStats = enhancedResults.cacheStats;
    }
    
    // Add supplementary results if any
    if (supplementaryResults.length > 0) {
      response.supplementary = supplementaryResults;
    }

    // Log search performance
    const cacheStatus = enhancedResults.cached ? 'HIT' : 'MISS';
    console.log(`✅ Search complete: ${enhancedResults.results.length} results, ${enhancedResults.searchTime}ms, Cache ${cacheStatus}`);

    res.json(response);
    
  } catch (error: any) {
    console.error('❌ Enhanced song search error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Handle rate limit errors specifically
    if (error.message?.includes('Rate limit')) {
      return res.status(429).json({ 
        error: 'Search rate limit exceeded - please try again in a moment',
        retryAfter: 5
      });
    }
    
    // Fallback to basic search if enhanced service fails
    console.log('🔄 Falling back to basic MusicBrainz search...');
    try {
      const fallbackResults = await musicBrainzApi.searchRecordings(searchQuery, parseInt(req.query.limit as string || '20'));
      
      res.json({
        results: fallbackResults,
        query: searchQuery,
        fallback: true,
        source: 'musicbrainz_basic',
        message: 'Enhanced search temporarily unavailable, using basic search'
      });
    } catch (fallbackError) {
      console.error('❌ Fallback search also failed:', fallbackError);
      res.status(500).json({ error: 'Search service temporarily unavailable' });
    }
  }
});

// GET /api/search/artists
router.get('/artists', optionalAuth, validateSearchQuery, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { q, limit = 20 } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Search using MusicBrainz as primary source
    const mbResults = await musicBrainzApi.searchArtists(q, parseInt(limit as string));

    res.json({
      query: q,
      results: {
        primary: mbResults,
        supplementary: [],
        total: mbResults.length,
        sources: {
          musicbrainz: mbResults.length
        }
      },
      source: 'musicbrainz',
      primary_source: 'musicbrainz'
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

    // Search using MusicBrainz as primary source
    const mbResults = await musicBrainzApi.searchReleases(q, parseInt(limit as string));

    res.json({
      query: q,
      results: {
        primary: mbResults,
        supplementary: [],
        total: mbResults.length,
        sources: {
          musicbrainz: mbResults.length
        }
      },
      source: 'musicbrainz',
      primary_source: 'musicbrainz'
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

    // Search for people using MusicBrainz as primary source
    const mbResults = await musicBrainzApi.searchArtists(q, parseInt(limit as string));

    res.json({
      query: q,
      role: role || 'all',
      results: {
        primary: mbResults,
        supplementary: [],
        total: mbResults.length,
        sources: {
          musicbrainz: mbResults.length
        }
      },
      source: 'musicbrainz',
      primary_source: 'musicbrainz'
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
    
    // Try to get details from MusicBrainz first, then fallback to Discogs
    let songDetails = null;
    let source = '';
    
    // Check if it's a MusicBrainz ID or Discogs ID
    if (id.startsWith('mb-')) {
      const mbId = id.replace('mb-', '').replace('basic-', '');
      songDetails = await musicBrainzApi.getRecordingDetails(mbId);
      source = 'musicbrainz';
    } else if (id.startsWith('discogs-')) {
      const discogsId = id.split('-')[1];
      if (discogsId && !isNaN(parseInt(discogsId))) {
        const release = await discogsApi.getReleaseDetails(parseInt(discogsId));
        if (release) {
          songDetails = release;
          source = 'discogs';
        }
      }
    }
    
    if (!songDetails) {
      return res.status(404).json({ error: 'Song not found' });
    }

    res.json({
      song: songDetails,
      source: source,
      id: id
    });
    
  } catch (error) {
    console.error('Song details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/search/song/:id/credits - Enhanced credits loading with caching
router.get('/song/:id/credits', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Security: Validate recording ID parameter
    if (!id) {
      return res.status(400).json({ error: 'Recording ID is required' });
    }
    
    // Security: Validate ID format and length
    if (typeof id !== 'string' || id.length > 100) {
      return res.status(400).json({ error: 'Invalid recording ID format' });
    }
    
    // Security: Only allow alphanumeric, hyphens, and our mb- prefix
    const validIdRegex = /^(mb-)?[a-f0-9-]+$/i;
    if (!validIdRegex.test(id)) {
      return res.status(400).json({ error: 'Invalid recording ID characters' });
    }

    console.log(`🎵 Loading enhanced credits for recording: ${req.params.id.substring(0, 50)}`);

    // Extract MusicBrainz ID if it's in our format (mb-xxxxx)
    const musicbrainzId = req.params.id.startsWith('mb-') ? req.params.id.replace('mb-', '') : req.params.id;
    
    // Use enhanced service for credits loading
    const enhancedCredits = await musicBrainzEnhancedService.loadEnhancedCredits(musicbrainzId);

    const response = {
      credits: enhancedCredits,
      recordingId: req.params.id,
      musicbrainzId: musicbrainzId,
      source: 'musicbrainz_enhanced',
      cached: enhancedCredits._cached || false,
      timestamp: new Date().toISOString()
    };

    console.log(`✅ Enhanced credits loaded for ${req.params.id}: ${Object.keys(enhancedCredits).join(', ')}`);

    res.json(response);
    
  } catch (error: any) {
    console.error('❌ Enhanced credits loading error:', error);
    
    if (error.message?.includes('Rate limit')) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded - please try again later',
        retryAfter: 5
      });
    }
    
    // Fallback to basic credits if enhanced fails
    console.log('🔄 Falling back to basic credits...');
    try {
      const musicbrainzId = req.params.id.startsWith('mb-') ? req.params.id.replace('mb-', '') : req.params.id;
      const recordingDetails = await musicBrainzApi.getRecordingDetails(musicbrainzId);
      
      if (recordingDetails) {
        const basicCredits = await musicBrainzApi.extractEnhancedCredits(recordingDetails);
        
        res.json({
          credits: basicCredits,
          recordingId: req.params.id,
          source: 'musicbrainz_basic',
          fallback: true,
          message: 'Enhanced credits temporarily unavailable, using basic credits'
        });
      } else {
        res.status(404).json({ error: 'Recording not found' });
      }
    } catch (fallbackError) {
      console.error('❌ Fallback credits also failed:', fallbackError);
      res.status(500).json({ error: 'Credits service temporarily unavailable' });
    }
  }
});

// GET /api/search/health - Enhanced search service health check
router.get('/health', async (req: Request, res: Response) => {
  try {
    console.log('🏥 Enhanced search health check requested');

    // Get enhanced service health
    const enhancedHealth = await musicBrainzEnhancedService.healthCheck();
    
    // Get service statistics
    const serviceStats = await musicBrainzEnhancedService.getServiceStats();

    const healthResponse = {
      status: enhancedHealth.status,
      timestamp: new Date().toISOString(),
      services: {
        musicbrainz_enhanced: enhancedHealth,
        redis_cache: serviceStats.cacheStats,
        rate_limiting: {
          status: 'operational',
          current_limit: '1 request per 1.1 seconds',
          last_request: serviceStats.lastRequestTime
        }
      },
      features: {
        smart_ranking: 'operational',
        intelligent_caching: 'operational', 
        query_parsing: 'operational',
        credits_enhancement: 'operational'
      },
      performance: {
        cache_strategy: 'Popular artists: 24h, Others: 6h',
        expected_cache_hit_rate: '>80% after 24 hours',
        expected_response_time: '<100ms cached, <2s uncached'
      }
    };

    console.log(`✅ Health check complete: ${enhancedHealth.status}`);

    const statusCode = enhancedHealth.status === 'healthy' ? 200 : 
                      enhancedHealth.status === 'degraded' ? 206 : 503;

    res.status(statusCode).json(healthResponse);
    
  } catch (error: any) {
    console.error('❌ Health check failed:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      services: {
        musicbrainz_enhanced: { status: 'error', error: error.message }
      }
    });
  }
});

// GET /api/search/stats - Enhanced search service statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    console.log('📊 Enhanced search stats requested');

    const serviceStats = await musicBrainzEnhancedService.getServiceStats();

    res.json({
      service: 'Enhanced MusicBrainz Search',
      timestamp: new Date().toISOString(),
      ...serviceStats
    });
    
  } catch (error: any) {
    console.error('❌ Stats request failed:', error);
    res.status(500).json({ error: 'Failed to retrieve service statistics' });
  }
});

module.exports = router;