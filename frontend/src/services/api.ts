const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Enhanced interfaces for new API response format
export interface EnhancedSearchResult {
  id: string;
  title: string;
  artist: string;
  album: string;
  year?: number;
  releaseDate?: string;
  duration?: number;
  source: 'musicbrainz' | 'discogs';
  musicbrainzId?: string;
  disambiguation?: string;
  priorityScore?: number;
  scoringReason?: string;
  cached?: boolean;
  credits: Credits;
}

export interface Credits {
  songwriters: Credit[];
  producers: Credit[];
  musicians: Credit[];
  engineers: Credit[];
  miscellaneous: Credit[];
}

export interface Credit {
  name: string;
  role: string;
  attributes?: string;
  instrument?: string;
  workTitle?: string;
}

export interface EnhancedSearchResponse {
  results: EnhancedSearchResult[];
  query: string;
  parsedQuery?: {
    artist: string;
    song: string;
  };
  totalCount: number;
  cached: boolean;
  searchTime?: number;
  sources: {
    musicbrainz: number;
    discogs: number;
  };
  primary_source: string;
  cacheStats?: {
    hit: boolean;
    ttl?: number;
  };
  supplementary?: any[];
}

// Legacy interfaces for backward compatibility
export interface SearchResult {
  id: string;
  name: string;
  type: 'song' | 'artist' | 'album' | 'person';
  metadata?: any;
}

export interface Song extends SearchResult {
  type: 'song';
  artist: string;
  album: string;
  year?: number;
  duration?: number;
  credits?: Credit[];
}

export interface Artist extends SearchResult {
  type: 'artist';
  genres?: string[];
  bio?: string;
  imageUrl?: string;
}

export interface Album extends SearchResult {
  type: 'album';
  artist: string;
  year?: number;
  trackCount?: number;
  imageUrl?: string;
}

export interface Person extends SearchResult {
  type: 'person';
  roles?: string[];
  knownFor?: string[];
}

export interface SearchResponse<T> {
  query: string;
  results: {
    primary: T[];
    supplementary: T[];
    total: number;
  };
  source: string;
}

// Performance and cache monitoring interfaces
export interface CacheStats {
  hit: boolean;
  ttl?: number;
}

export interface SearchPerformance {
  searchTime: number;
  cached: boolean;
  cacheStats?: CacheStats;
}

class ApiService {
  // Enhanced request method for new API format
  private async enhancedRequest(endpoint: string): Promise<EnhancedSearchResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Enhanced API request failed:', error);
      throw error;
    }
  }

  // Legacy request method for backward compatibility
  private async request<T>(endpoint: string): Promise<SearchResponse<T>> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Enhanced song search with smart prioritization
  async searchSongs(query: string, limit = 20): Promise<EnhancedSearchResponse> {
    return this.enhancedRequest(`/search/songs?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  // Enhanced song search with separate title and artist fields
  async searchSongsWithFields(songTitle: string, artistName?: string, limit = 20): Promise<EnhancedSearchResponse> {
    let url = `/search/songs?song=${encodeURIComponent(songTitle)}&limit=${limit}`;
    if (artistName && artistName.trim()) {
      url += `&artist=${encodeURIComponent(artistName.trim())}`;
    }
    return this.enhancedRequest(url);
  }

  // Legacy methods for backward compatibility
  async searchArtists(query: string, limit = 20): Promise<SearchResponse<any>> {
    return this.request<any>(`/search/artists?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async searchAlbums(query: string, limit = 20): Promise<SearchResponse<any>> {
    return this.request<any>(`/search/albums?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async searchPeople(query: string, role?: string, limit = 20): Promise<SearchResponse<any>> {
    const roleParam = role ? `&role=${encodeURIComponent(role)}` : '';
    return this.request<any>(`/search/people?q=${encodeURIComponent(query)}${roleParam}&limit=${limit}`);
  }

  async getSongDetails(id: string): Promise<SearchResponse<any>> {
    return this.request<any>(`/search/song/${id}`);
  }

  // Enhanced credits loading
  async getSongCredits(id: string): Promise<{ credits: Credits; recordingId: string; source: string; cached: boolean }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${API_BASE_URL}/search/song/${id}/credits`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Credits request failed:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();