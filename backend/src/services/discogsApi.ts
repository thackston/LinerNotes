import axios from 'axios';
import { config } from '../config/config';
import { CacheService } from '../config/redis';

export interface DiscogsSearchResult {
  id: number;
  type: string;
  title: string;
  year?: number;
  genre?: string[];
  style?: string[];
  format?: string[];
  country?: string;
  catno?: string;
  barcode?: string[];
  uri: string;
  resource_url: string;
  master_id?: number;
  master_url?: string;
  thumb?: string;
  cover_image?: string;
  user_data?: any;
}

export interface DiscogsRelease {
  id: number;
  title: string;
  artists: DiscogsArtist[];
  year?: number;
  released?: string;
  genres?: string[];
  styles?: string[];
  tracklist: DiscogsTrack[];
  extraartists?: DiscogsArtist[];
  videos?: any[];
  labels?: any[];
  companies?: any[];
  formats?: any[];
  data_quality?: string;
  community?: any;
  country?: string;
  notes?: string;
  released_formatted?: string;
  identifiers?: any[];
  series?: any[];
  estimated_weight?: number;
  images?: any[];
}

export interface DiscogsArtist {
  id: number;
  name: string;
  anv?: string;
  join?: string;
  role?: string;
  tracks?: string;
  resource_url: string;
}

export interface DiscogsTrack {
  position: string;
  type_: string;
  title: string;
  duration?: string;
  extraartists?: DiscogsArtist[];
  artists?: DiscogsArtist[];
}

class DiscogsApiService {
  private client: any;
  private baseUrl = 'https://api.discogs.com';

  constructor() {
    const headers: any = {
      'User-Agent': config.discogsUserAgent,
    };

    // Only add authorization if token is provided
    if (config.discogsUserToken && config.discogsUserToken !== 'your-discogs-user-token-here') {
      headers['Authorization'] = `Discogs token=${config.discogsUserToken}`;
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers,
      timeout: 10000,
    });

    // Add rate limiting (Discogs allows 60 requests per minute for authenticated users)
    this.client.interceptors.request.use(async (config: any) => {
      // Simple rate limiting - wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      return config;
    });
  }

  async searchReleases(query: string, limit: number = 20): Promise<any[]> {
    // Return empty results if no token is configured
    if (!config.discogsUserToken || config.discogsUserToken === 'your-discogs-user-token-here') {
      console.log('🔒 Discogs API token not configured, skipping Discogs search');
      return [];
    }

    // Sanitize query for cache key to prevent injection
    const sanitizedQuery = query.replace(/[^a-zA-Z0-9\s\-_]/g, '').substring(0, 100);
    const cacheKey = `discogs:releases:${sanitizedQuery}:${limit}`;
    
    // Check cache first
    const cached = await CacheService.getCachedApiResponse('discogs-releases', { query, limit });
    if (cached) {
      return cached;
    }

    try {
      const response = await this.client.get('/database/search', {
        params: {
          q: query,
          type: 'release',
          per_page: Math.min(limit, 100), // Discogs max is 100
          page: 1
        }
      });

      const results = response.data.results || [];
      
      // Get detailed information for each release to extract credits
      const detailedResults = await Promise.all(
        results.slice(0, limit).map(async (release: DiscogsSearchResult) => {
          try {
            const detailed = await this.getReleaseDetails(release.id);
            return this.formatReleaseForSearch(detailed, query);
          } catch (error) {
            console.error(`Error fetching details for release ${release.id}:`, error);
            return this.formatBasicRelease(release, query);
          }
        })
      );

      // Cache for 2 hours
      await CacheService.cacheApiResponse('discogs-releases', { query, limit }, detailedResults, 7200);
      
      return detailedResults;
    } catch (error: any) {
      console.error('❌ Discogs API search error:', error.response?.status, error.response?.statusText);
      // Don't log full error details that might contain sensitive info
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        console.error('❌ Discogs API error details:', error.response?.data);
      }
      return [];
    }
  }

  async getReleaseDetails(releaseId: number): Promise<DiscogsRelease> {
    const cacheKey = `discogs:release:${releaseId}`;
    
    const cached = await CacheService.getCachedApiResponse('discogs-release-details', { releaseId });
    if (cached) {
      return cached;
    }

    const response = await this.client.get(`/releases/${releaseId}`);
    const release = response.data;

    // Cache for 24 hours
    await CacheService.cacheApiResponse('discogs-release-details', { releaseId }, release, 86400);
    
    return release;
  }

  private formatReleaseForSearch(release: DiscogsRelease, query: string): any {
    // Extract primary artists
    const mainArtists = release.artists?.map(a => a.name).join(', ') || 'Unknown Artist';
    
    // Extract credits from extraartists and track-level artists
    const credits = this.extractCredits(release);
    
    // Find the most relevant track based on query
    const relevantTrack = this.findRelevantTrack(release.tracklist, query);
    
    if (relevantTrack) {
      // Return as song format if we found a matching track
      return {
        id: `discogs-${release.id}-${relevantTrack.position}`,
        title: relevantTrack.title,
        artist: mainArtists,
        album: release.title,
        year: release.year,
        releaseDate: release.released,
        duration: this.parseDuration(relevantTrack.duration),
        credits: credits,
        source: 'discogs',
        discogsId: release.id,
        trackPosition: relevantTrack.position
      };
    } else {
      // Return as album format
      return {
        id: `discogs-album-${release.id}`,
        title: release.title,
        artist: mainArtists,
        year: release.year,
        releaseDate: release.released,
        genres: release.genres,
        styles: release.styles,
        trackCount: release.tracklist?.length || 0,
        credits: credits,
        source: 'discogs',
        discogsId: release.id
      };
    }
  }

  private formatBasicRelease(release: DiscogsSearchResult, query: string): any {
    return {
      id: `discogs-basic-${release.id}`,
      title: release.title,
      year: release.year,
      genres: release.genre,
      styles: release.style,
      source: 'discogs',
      discogsId: release.id,
      thumb: release.thumb
    };
  }

  private extractCredits(release: DiscogsRelease): any {
    const credits = {
      songwriters: [] as any[],
      producers: [] as any[],
      musicians: [] as any[],
      engineers: [] as any[],
      miscellaneous: [] as any[]
    };

    // Process extraartists (album-level credits)
    if (release.extraartists) {
      release.extraartists.forEach(artist => {
        const role = artist.role?.toLowerCase() || '';
        const credit = {
          name: artist.name,
          role: artist.role || 'Contributor',
          tracks: artist.tracks
        };

        if (role.includes('written') || role.includes('composer') || role.includes('songwriter')) {
          credits.songwriters.push(credit);
        } else if (role.includes('producer')) {
          credits.producers.push(credit);
        } else if (role.includes('engineer') || role.includes('mix') || role.includes('master')) {
          credits.engineers.push(credit);
        } else if (role.includes('guitar') || role.includes('bass') || role.includes('drum') || 
                   role.includes('piano') || role.includes('vocal') || role.includes('instrument')) {
          credits.musicians.push({
            ...credit,
            instrument: artist.role
          });
        } else {
          credits.miscellaneous.push(credit);
        }
      });
    }

    // Process track-level artists
    release.tracklist?.forEach(track => {
      if (track.extraartists) {
        track.extraartists.forEach(artist => {
          const role = artist.role?.toLowerCase() || '';
          const credit = {
            name: artist.name,
            role: artist.role || 'Contributor',
            tracks: track.title
          };

          if (role.includes('written') || role.includes('composer')) {
            credits.songwriters.push(credit);
          } else if (role.includes('guitar') || role.includes('bass') || role.includes('drum') || 
                     role.includes('piano') || role.includes('vocal') || role.includes('instrument')) {
            credits.musicians.push({
              ...credit,
              instrument: artist.role
            });
          }
        });
      }
    });

    // Remove duplicates
    Object.keys(credits).forEach(key => {
      credits[key as keyof typeof credits] = credits[key as keyof typeof credits].filter((credit, index, self) =>
        index === self.findIndex(c => c.name === credit.name && c.role === credit.role)
      );
    });

    return credits;
  }

  private findRelevantTrack(tracklist: DiscogsTrack[], query: string): DiscogsTrack | null {
    if (!tracklist) return null;
    
    const queryLower = query.toLowerCase();
    
    // Find exact title match
    const exactMatch = tracklist.find(track => 
      track.title.toLowerCase() === queryLower
    );
    if (exactMatch) return exactMatch;

    // Find partial title match
    const partialMatch = tracklist.find(track => 
      track.title.toLowerCase().includes(queryLower) || queryLower.includes(track.title.toLowerCase())
    );
    if (partialMatch) return partialMatch;

    return null;
  }

  private parseDuration(duration?: string): number | undefined {
    if (!duration) return undefined;
    
    const parts = duration.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]);
      const seconds = parseInt(parts[1]);
      return minutes * 60 + seconds;
    }
    
    return undefined;
  }
}

export const discogsApi = new DiscogsApiService();