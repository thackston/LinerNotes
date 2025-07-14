import { createClient } from 'redis';
import { config } from '../../config/config';

/**
 * Enhanced Redis Service for Smart Caching
 * Supports intelligent cache key generation, TTL management, and search optimization
 */
export class RedisService {
  private client: any;
  private isConnected: boolean = false;

  constructor() {
    this.client = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password || undefined,
    });

    this.setupEventListeners();
    this.connect();
  }

  private setupEventListeners(): void {
    this.client.on('error', (err: Error) => {
      console.error('❌ Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      console.log('✅ Enhanced Redis Service Connected');
      this.isConnected = false; // Still connecting
    });

    this.client.on('ready', () => {
      console.log('🚀 Enhanced Redis Service Ready');
      this.isConnected = true;
    });

    this.client.on('end', () => {
      console.log('🔌 Enhanced Redis Service Disconnected');
      this.isConnected = false;
    });
  }

  private async connect(): Promise<void> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
    } catch (error) {
      console.error('❌ Failed to connect Enhanced Redis Service:', error);
      // Don't throw - app should work without Redis
    }
  }

  // Core cache operations with enhanced error handling
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) {
      console.warn('Redis not connected, skipping GET for key:', key);
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (value) {
        console.log(`🎯 Cache HIT: ${key}`);
        return JSON.parse(value);
      } else {
        console.log(`❌ Cache MISS: ${key}`);
        return null;
      }
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    if (!this.isConnected) {
      console.warn('Redis not connected, skipping SET for key:', key);
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, serialized);
        console.log(`💾 Cache SET with TTL: ${key} (${ttlSeconds}s)`);
      } else {
        await this.client.set(key, serialized);
        console.log(`💾 Cache SET: ${key}`);
      }
      return true;
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.isConnected) {
      console.warn('Redis not connected, skipping DEL for key:', key);
      return false;
    }

    try {
      await this.client.del(key);
      console.log(`🗑️ Cache DELETE: ${key}`);
      return true;
    } catch (error) {
      console.error('Redis DEL error:', error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  }

  // Smart cache key generation for search optimization
  generateSearchKey(artist: string, song: string): string {
    // Security: Validate input lengths to prevent abuse
    if (artist.length > 200 || song.length > 200) {
      throw new Error('Search terms too long for caching');
    }
    
    // Normalize search terms for consistent caching
    const normalizedArtist = this.normalizeSearchTerm(artist);
    const normalizedSong = this.normalizeSearchTerm(song);
    
    // Security: Ensure normalized terms don't contain Redis key separators
    if (normalizedArtist.includes(':') || normalizedSong.includes(':')) {
      throw new Error('Invalid characters in search terms');
    }
    
    return `search:${normalizedArtist}:${normalizedSong}`;
  }

  generateAlbumKey(artist: string, album: string): string {
    // Security: Validate input lengths
    if (artist.length > 200 || album.length > 200) {
      throw new Error('Search terms too long for caching');
    }
    
    const normalizedArtist = this.normalizeSearchTerm(artist);
    const normalizedAlbum = this.normalizeSearchTerm(album);
    
    // Security: Check for key separator injection
    if (normalizedArtist.includes(':') || normalizedAlbum.includes(':')) {
      throw new Error('Invalid characters in search terms');
    }
    
    return `album:${normalizedArtist}:${normalizedAlbum}`;
  }

  generateArtistKey(artist: string): string {
    // Security: Validate input length
    if (artist.length > 200) {
      throw new Error('Artist name too long for caching');
    }
    
    const normalizedArtist = this.normalizeSearchTerm(artist);
    
    // Security: Check for key separator injection
    if (normalizedArtist.includes(':')) {
      throw new Error('Invalid characters in artist name');
    }
    
    return `artist:${normalizedArtist}`;
  }

  generateCreditsKey(recordingId: string): string {
    // Security: Validate MusicBrainz ID format (UUIDs)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(recordingId)) {
      throw new Error('Invalid recording ID format');
    }
    
    return `credits:${recordingId}`;
  }

  // Enhanced search-specific cache methods
  async cacheSearchResults(
    artist: string, 
    song: string, 
    results: any[], 
    ttlSeconds: number = 3600
  ): Promise<void> {
    const key = this.generateSearchKey(artist, song);
    const cacheData = {
      results,
      cached_at: new Date().toISOString(),
      ttl: ttlSeconds,
      search_terms: { artist, song }
    };
    await this.set(key, cacheData, ttlSeconds);
  }

  async getCachedSearchResults(artist: string, song: string): Promise<any[] | null> {
    const key = this.generateSearchKey(artist, song);
    const cached = await this.get<any>(key);
    
    if (cached && cached.results) {
      console.log(`🎯 Returning cached search results for: ${artist} - ${song}`);
      return cached.results;
    }
    
    return null;
  }

  async cacheCredits(recordingId: string, credits: any, ttlSeconds: number = 86400): Promise<void> {
    const key = this.generateCreditsKey(recordingId);
    const cacheData = {
      credits,
      cached_at: new Date().toISOString(),
      recording_id: recordingId
    };
    await this.set(key, cacheData, ttlSeconds);
  }

  async getCachedCredits(recordingId: string): Promise<any | null> {
    const key = this.generateCreditsKey(recordingId);
    const cached = await this.get<any>(key);
    
    if (cached && cached.credits) {
      console.log(`🎯 Returning cached credits for recording: ${recordingId}`);
      return cached.credits;
    }
    
    return null;
  }

  // Smart TTL calculation based on artist popularity
  calculateSearchTTL(artist: string): number {
    const popularArtists = [
      'the beatles', 'queen', 'led zeppelin', 'pink floyd',
      'david bowie', 'bob dylan', 'prince', 'michael jackson',
      'madonna', 'elvis presley', 'the rolling stones', 'radiohead'
    ];
    
    const normalizedArtist = artist.toLowerCase().trim();
    const isPopular = popularArtists.includes(normalizedArtist);
    
    // Popular artists: 24 hours, others: 6 hours
    const ttl = isPopular ? 24 * 3600 : 6 * 3600;
    
    console.log(`⏰ TTL for "${artist}": ${ttl}s (${isPopular ? 'popular' : 'standard'})`);
    return ttl;
  }

  // Utility methods
  private normalizeSearchTerm(term: string): string {
    return term
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_'); // Replace spaces with underscores
  }

  // Cache statistics and monitoring
  async getCacheStats(): Promise<any> {
    if (!this.isConnected) return { connected: false };

    try {
      const info = await this.client.info('memory');
      const keyCount = await this.client.dbSize();
      
      return {
        connected: true,
        memory_info: info,
        key_count: keyCount,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('Error getting cache stats:', error);
      return { connected: false, error: error.message };
    }
  }

  // Cleanup and maintenance
  async clearSearchCache(): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const searchKeys = await this.client.keys('search:*');
      if (searchKeys.length > 0) {
        await this.client.del(searchKeys);
        console.log(`🧹 Cleared ${searchKeys.length} search cache entries`);
      }
      return true;
    } catch (error) {
      console.error('Error clearing search cache:', error);
      return false;
    }
  }

  async clearCreditsCache(): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const creditsKeys = await this.client.keys('credits:*');
      if (creditsKeys.length > 0) {
        await this.client.del(creditsKeys);
        console.log(`🧹 Cleared ${creditsKeys.length} credits cache entries`);
      }
      return true;
    } catch (error) {
      console.error('Error clearing credits cache:', error);
      return false;
    }
  }

  // Graceful shutdown
  async disconnect(): Promise<void> {
    try {
      if (this.client.isOpen) {
        await this.client.quit();
        console.log('🔌 Enhanced Redis Service disconnected gracefully');
      }
    } catch (error) {
      console.error('Error disconnecting Enhanced Redis Service:', error);
    }
  }
}

// Export a singleton instance
export const redisService = new RedisService();

// Graceful shutdown handling
process.on('SIGINT', async () => {
  await redisService.disconnect();
});

process.on('SIGTERM', async () => {
  await redisService.disconnect();
});