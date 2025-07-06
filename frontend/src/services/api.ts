const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

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

export interface Credit {
  name: string;
  role: string;
  instruments?: string[];
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

class ApiService {
  private async request<T>(endpoint: string): Promise<SearchResponse<T>> {
    try {
      // Add timeout and abort controller for security
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

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

  async searchSongs(query: string, limit = 20): Promise<SearchResponse<any>> {
    return this.request<any>(`/search/songs?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

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
}

export const apiService = new ApiService();