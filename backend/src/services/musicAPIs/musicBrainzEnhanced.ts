import axios from 'axios';
import { config } from '../../config/config';
import { redisService } from '../cache/redisService';
import { smartRankingService, MusicBrainzRecording, ScoredResult } from '../prioritization/smartRanking';

/**
 * Enhanced MusicBrainz Service
 * 
 * Combines MusicBrainz API with smart prioritization and intelligent caching
 * Features:
 * - Smart result ranking (original albums > compilations)
 * - Redis caching with TTL optimization
 * - Rate limit compliance (1 req/sec)
 * - Enhanced credits extraction
 * - Performance monitoring
 */

export interface EnhancedSearchResult {
  id: string;
  title: string;
  artist: string;
  album: string;
  year?: number;
  releaseDate?: string;
  duration?: number;
  credits?: any;
  source: 'musicbrainz';
  musicbrainzId: string;
  disambiguation?: string;
  priorityScore: number;
  scoringReason: string;
  cached: boolean;
}

export interface SearchResponse {
  results: EnhancedSearchResult[];
  totalCount: number;
  cached: boolean;
  searchTime: number;
  artistSearched: string;
  songSearched: string;
  cacheStats: {
    hit: boolean;
    ttl?: number;
  };
}

export class MusicBrainzEnhancedService {
  private baseUrl = 'https://musicbrainz.org/ws/2';
  private userAgent: string;
  private rateLimit = 1100; // 1.1 seconds between requests for safety
  private lastRequestTime = 0;
  private requestQueue: Promise<any> = Promise.resolve();

  constructor() {
    this.userAgent = config.musicBrainzUserAgent;
  }

  /**
   * Main search method with smart prioritization and caching
   */
  async searchWithSmartPrioritization(
    artist: string, 
    song: string, 
    limit: number = 25
  ): Promise<SearchResponse> {
    const searchStart = Date.now();
    
    console.log(`🔍 Enhanced search: "${artist}" - "${song}" (limit: ${limit})`);

    // Step 1: Check cache first
    const cachedResults = await redisService.getCachedSearchResults(artist, song);
    if (cachedResults) {
      console.log(`🎯 Cache HIT: Returning cached results for "${artist}" - "${song}"`);
      return {
        results: cachedResults.slice(0, limit),
        totalCount: cachedResults.length,
        cached: true,
        searchTime: Date.now() - searchStart,
        artistSearched: artist,
        songSearched: song,
        cacheStats: { hit: true }
      };
    }

    console.log(`❌ Cache MISS: Fetching from MusicBrainz for "${artist}" - "${song}"`);

    // Step 2: Search MusicBrainz API with rate limiting
    const rawResults = await this.searchMusicBrainzWithQueue(artist, song, limit * 2); // Get more for better ranking

    // Step 3: Apply smart prioritization
    console.log(`🧠 Applying smart ranking to ${rawResults.length} results...`);
    const rankedResults = smartRankingService.sortResults(rawResults, artist);

    // Step 4: Transform to frontend format
    const enhancedResults = this.transformResults(rankedResults, true);

    // Step 5: Cache results with intelligent TTL
    const ttl = redisService.calculateSearchTTL(artist);
    await redisService.cacheSearchResults(artist, song, enhancedResults, ttl);

    console.log(`✅ Enhanced search complete: ${enhancedResults.length} results, ${Date.now() - searchStart}ms`);

    return {
      results: enhancedResults.slice(0, limit),
      totalCount: enhancedResults.length,
      cached: false,
      searchTime: Date.now() - searchStart,
      artistSearched: artist,
      songSearched: song,
      cacheStats: { hit: false, ttl }
    };
  }

  /**
   * Search MusicBrainz with request queuing for rate limit compliance
   */
  private async searchMusicBrainzWithQueue(
    artist: string, 
    song: string, 
    limit: number
  ): Promise<MusicBrainzRecording[]> {
    // Add to request queue to ensure proper rate limiting
    this.requestQueue = this.requestQueue.then(async () => {
      return this.performMusicBrainzSearch(artist, song, limit);
    });

    return this.requestQueue;
  }

  /**
   * Perform the actual MusicBrainz API search with fallback queries
   */
  private async performMusicBrainzSearch(
    artist: string, 
    song: string, 
    limit: number
  ): Promise<MusicBrainzRecording[]> {
    try {
      // Build multiple query strategies
      const queries = this.buildSearchQueries(artist, song);
      
      let allResults: MusicBrainzRecording[] = [];
      
      // Try each query until we get good results
      for (let i = 0; i < queries.length && allResults.length < limit; i++) {
        const query = queries[i];
        
        try {
          // Respect rate limit
          await this.enforceRateLimit();
          
          console.log(`🌐 MusicBrainz API call (attempt ${i + 1}): ${query}`);

          const response = await axios.get(`${this.baseUrl}/recording`, {
            params: {
              query,
              fmt: 'json',
              limit: Math.min(limit, 100), // MusicBrainz max is 100
              inc: 'releases+release-groups+artist-credits+artist-rels+work-rels+recording-rels'
            },
            headers: {
              'User-Agent': this.userAgent
            },
            timeout: 15000
          });

          this.lastRequestTime = Date.now();

          // Filter and enhance results
          const recordings = (response.data as any).recordings || [];
          console.log(`📦 Query ${i + 1} returned ${recordings.length} raw results`);

          const filteredResults = this.filterOfficialReleases(recordings);
          
          // Add unique results (avoid duplicates)
          for (const result of filteredResults) {
            if (!allResults.find(existing => existing.id === result.id)) {
              allResults.push(result);
            }
          }
          
          // If we got good results from exact match, use those preferentially
          if (i === 0 && filteredResults.length > 0) {
            console.log(`✅ Exact match found, using ${filteredResults.length} results`);
            break;
          }
          
        } catch (queryError: any) {
          console.warn(`⚠️ Query ${i + 1} failed: ${queryError.message}`);
          // Continue to next query
        }
      }

      return allResults;

    } catch (error: any) {
      console.error('❌ MusicBrainz API error:', error.message);
      
      if (error.response?.status === 503 || error.response?.status === 429) {
        console.warn('⚠️ MusicBrainz rate limit hit, backing off...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        throw new Error('Rate limit exceeded - please try again later');
      }
      
      throw new Error(`MusicBrainz search failed: ${error.message}`);
    }
  }

  /**
   * Build multiple search queries for MusicBrainz with fallback strategies
   */
  private buildSearchQueries(artist: string, song: string): string[] {
    // Security: Validate input lengths
    if (artist.length > 200 || song.length > 200) {
      throw new Error('Search terms too long');
    }
    
    // Security: Sanitize inputs for Lucene query injection
    const sanitizedArtist = this.sanitizeLuceneQuery(artist);
    const sanitizedSong = this.sanitizeLuceneQuery(song);
    
    const queries: string[] = [];

    // Build more flexible queries for better results
    if (sanitizedArtist && sanitizedSong) {
      // Try exact match first, then fuzzy matching
      queries.push(`recording:"${sanitizedSong}" AND artist:"${sanitizedArtist}"`);
      queries.push(`recording:${sanitizedSong} AND artist:${sanitizedArtist}`);
      queries.push(`${sanitizedSong} AND artist:${sanitizedArtist}`);
    } else if (sanitizedSong) {
      // Song only search with multiple strategies
      queries.push(`recording:"${sanitizedSong}"`);
      queries.push(`recording:${sanitizedSong}`);
      queries.push(`${sanitizedSong}`);
    } else if (sanitizedArtist) {
      // Artist only search
      queries.push(`artist:"${sanitizedArtist}"`);
      queries.push(`artist:${sanitizedArtist}`);
    } else {
      throw new Error('Either artist or song must be provided');
    }

    return queries;
  }

  /**
   * Sanitize input for Lucene query to prevent injection
   */
  private sanitizeLuceneQuery(input: string): string {
    if (!input) return '';
    
    // Remove or escape Lucene special characters
    return input
      .replace(/[+\-&|!(){}[\]^"~*?:\\]/g, ' ') // Remove special chars
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Filter to only official releases and add proper types
   */
  private filterOfficialReleases(recordings: any[]): MusicBrainzRecording[] {
    return recordings
      .map(recording => ({
        ...recording,
        releases: recording.releases?.filter((release: any) => 
          release.status === 'Official' || !release.status // Include releases without status
        ) || []
      }))
      .filter(recording => recording.releases.length > 0); // Only keep recordings with releases
  }

  /**
   * Transform scored results to frontend format
   */
  private transformResults(scoredResults: ScoredResult[], includeDebugInfo: boolean = false): EnhancedSearchResult[] {
    return scoredResults.map(result => {
      const bestRelease = result._bestRelease || result.releases?.[0];
      const earliestYear = this.getEarliestYear(result.releases || []);

      const transformed: EnhancedSearchResult = {
        id: `mb-${result.id}`,
        title: result.title,
        artist: this.extractArtistName(result),
        album: bestRelease?.title || 'Unknown Album',
        year: earliestYear !== 9999 ? earliestYear : undefined,
        releaseDate: bestRelease?.['first-release-date'] || bestRelease?.date,
        duration: result.length ? Math.floor(result.length / 1000) : undefined,
        source: 'musicbrainz',
        musicbrainzId: result.id,
        disambiguation: result.disambiguation,
        priorityScore: result._priorityScore,
        scoringReason: result._scoringReason,
        cached: false,
        credits: this.extractBasicCredits(result) // Basic credits for now
      };

      return transformed;
    });
  }

  /**
   * Extract artist name from MusicBrainz result
   */
  private extractArtistName(result: MusicBrainzRecording): string {
    if (result['artist-credit'] && result['artist-credit'].length > 0) {
      return result['artist-credit'].map(ac => ac.name).join(', ');
    }
    
    // Fallback to release artist credits
    const firstRelease = result.releases?.[0];
    if (firstRelease?.['artist-credit']) {
      return firstRelease['artist-credit'].map(ac => ac.name).join(', ');
    }
    
    return 'Unknown Artist';
  }

  /**
   * Extract basic credits from MusicBrainz recording data
   */
  private extractBasicCredits(result: MusicBrainzRecording): any {
    const credits = {
      songwriters: [] as any[],
      producers: [] as any[],
      musicians: [] as any[],
      engineers: [] as any[],
      miscellaneous: [] as any[]
    };

    // Extract credits from artist-credit and relations if available
    if (result['artist-credit']) {
      result['artist-credit'].forEach((artistCredit: any) => {
        if (artistCredit.artist) {
          // Add to musicians
          credits.musicians.push({
            name: artistCredit.artist.name,
            role: 'Artist',
            attributes: artistCredit.joinphrase || undefined
          });
          
          // For popular artists, also add as potential songwriter if no explicit songwriters found later
          // This will be overridden if we find actual relationship data
          credits.songwriters.push({
            name: artistCredit.artist.name,
            role: 'Artist (assumed songwriter)',
            attributes: 'performer'
          });
        }
      });
    }

    // Look for composer/songwriter info in relationships (if present)
    let foundActualSongwriters = false;
    const recordingWithRelations = result as any; // Type assertion for relations property
    if (recordingWithRelations.relations && recordingWithRelations.relations.length > 0) {
      recordingWithRelations.relations.forEach((relation: any) => {
        if (relation.type && relation.artist) {
          const roleType = relation.type.toLowerCase();
          const credit = {
            name: relation.artist.name,
            role: relation.type,
            attributes: relation.attributes?.join(', ') || undefined
          };

          if (roleType.includes('composer') || roleType.includes('lyricist') || roleType.includes('writer')) {
            // Found actual songwriter data - clear assumed songwriters on first real songwriter
            if (!foundActualSongwriters) {
              credits.songwriters = []; // Clear assumed songwriters
              foundActualSongwriters = true;
            }
            credits.songwriters.push(credit);
          } else if (roleType.includes('producer')) {
            credits.producers.push(credit);
          } else if (roleType.includes('performer') || roleType.includes('vocal') || roleType.includes('instrument')) {
            credits.musicians.push({
              ...credit,
              instrument: relation.attributes?.join(', ') || relation.type
            });
          } else if (roleType.includes('engineer') || roleType.includes('mix') || roleType.includes('master')) {
            credits.engineers.push(credit);
          } else {
            credits.miscellaneous.push(credit);
          }
        }
      });
    }
    
    // If no explicit songwriters found, keep the assumed ones but mark them clearly
    if (!foundActualSongwriters && credits.songwriters.length > 0) {
      credits.songwriters = credits.songwriters.map(sw => ({
        ...sw,
        role: 'Performer (likely songwriter)'
      }));
    }

    // Debug logging for songwriter information
    if (credits.songwriters.length > 0) {
      console.log(`🎼 Found ${credits.songwriters.length} songwriter(s) for "${result.title}":`, 
                  credits.songwriters.map(sw => `${sw.name} (${sw.role})`).join(', '));
    } else {
      console.log(`❌ No songwriters found for "${result.title}"`);
    }

    return credits;
  }

  /**
   * Get earliest release year
   */
  private getEarliestYear(releases: any[]): number {
    if (!releases.length) return 9999;

    const years = releases
      .map(release => {
        const dateStr = release['first-release-date'] || release.date;
        if (!dateStr) return 9999;
        const year = new Date(dateStr).getFullYear();
        return isNaN(year) ? 9999 : year;
      })
      .filter(year => year > 1900 && year < 2100);

    return years.length > 0 ? Math.min(...years) : 9999;
  }

  /**
   * Enforce rate limiting (1 request per second)
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimit) {
      const waitTime = this.rateLimit - timeSinceLastRequest;
      console.log(`⏰ Rate limiting: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Enhanced credits loading (separate endpoint for detailed credits)
   */
  async loadEnhancedCredits(recordingId: string): Promise<any> {
    console.log(`🎵 Loading enhanced credits for recording: ${recordingId}`);

    // Check cache first
    const cached = await redisService.getCachedCredits(recordingId);
    if (cached) {
      console.log(`🎯 Credits cache HIT for: ${recordingId}`);
      return cached;
    }

    try {
      // Enforce rate limit for credits request
      await this.enforceRateLimit();

      const response = await axios.get(`${this.baseUrl}/recording/${recordingId}`, {
        params: {
          fmt: 'json',
          inc: 'artist-rels+work-rels+recording-rels'
        },
        headers: {
          'User-Agent': this.userAgent
        },
        timeout: 10000
      });

      this.lastRequestTime = Date.now();

      const credits = this.parseEnhancedCredits((response.data as any).relations || []);
      
      // Cache credits for 24 hours
      await redisService.cacheCredits(recordingId, credits, 86400);

      console.log(`✅ Enhanced credits loaded for: ${recordingId}`);
      return credits;

    } catch (error: any) {
      console.error(`❌ Failed to load credits for ${recordingId}:`, error.message);
      
      if (error.response?.status === 503 || error.response?.status === 429) {
        throw new Error('Rate limit exceeded - please try again later');
      }
      
      // Return empty credits on error
      return this.extractBasicCredits({} as MusicBrainzRecording);
    }
  }

  /**
   * Parse enhanced credits from MusicBrainz relationships
   */
  private parseEnhancedCredits(relations: any[]): any {
    const credits = {
      songwriters: [] as any[],
      producers: [] as any[],
      musicians: [] as any[],
      engineers: [] as any[],
      miscellaneous: [] as any[]
    };

    relations.forEach(rel => {
      if (rel.artist) {
        const credit = {
          name: rel.artist.name,
          role: rel.type || 'Contributor',
          attributes: rel.attributes?.join(', ') || undefined
        };

        const roleType = rel.type?.toLowerCase() || '';
        
        if (roleType.includes('composer') || roleType.includes('lyricist') || roleType.includes('writer')) {
          credits.songwriters.push(credit);
        } else if (roleType.includes('producer')) {
          credits.producers.push(credit);
        } else if (roleType.includes('performer') || roleType.includes('vocal') || roleType.includes('instrument')) {
          credits.musicians.push({
            ...credit,
            instrument: rel.attributes?.join(', ') || rel.type
          });
        } else if (roleType.includes('engineer') || roleType.includes('mix') || roleType.includes('master')) {
          credits.engineers.push(credit);
        } else {
          credits.miscellaneous.push(credit);
        }
      }
    });

    return credits;
  }

  /**
   * Get service statistics for monitoring
   */
  async getServiceStats(): Promise<any> {
    const cacheStats = await redisService.getCacheStats();
    
    return {
      service: 'MusicBrainzEnhanced',
      rateLimit: `${this.rateLimit}ms between requests`,
      lastRequestTime: this.lastRequestTime,
      cacheStats,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Health check for the enhanced service
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const stats = await this.getServiceStats();
      return {
        status: 'healthy',
        details: stats
      };
    } catch (error: any) {
      return {
        status: 'degraded',
        details: { error: error.message }
      };
    }
  }
}

// Export singleton instance
export const musicBrainzEnhancedService = new MusicBrainzEnhancedService();