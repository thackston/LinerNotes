import axios from 'axios';
import { config } from '../config/config';
import { CacheService } from '../config/redis';

interface MusicBrainzResult {
  id: string;
  score: number;
  title?: string;
  name?: string;
  disambiguation?: string;
  'artist-credit'?: Array<{
    name: string;
    artist: {
      id: string;
      name: string;
    };
  }>;
}

interface MusicBrainzResponse {
  created: string;
  count: number;
  offset: number;
  recordings?: MusicBrainzResult[];
  artists?: MusicBrainzResult[];
  releases?: MusicBrainzResult[];
}

class MusicBrainzApiService {
  private baseUrl = 'https://musicbrainz.org/ws/2';
  private userAgent: string;
  private rateLimit = 1000; // 1 request per second as per MusicBrainz guidelines

  constructor() {
    this.userAgent = config.musicBrainzUserAgent;
  }

  private async makeRequest(endpoint: string, params: Record<string, any>): Promise<any> {
    // Check cache first
    const cacheKey = `mb:${endpoint}:${JSON.stringify(params)}`;
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      const response = await axios.get(`${this.baseUrl}/${endpoint}`, {
        params: {
          ...params,
          fmt: 'json'
        },
        headers: {
          'User-Agent': this.userAgent
        },
        timeout: 5000
      });

      // Cache for 24 hours
      await CacheService.set(cacheKey, JSON.stringify(response.data), 86400);

      // Rate limiting - wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, this.rateLimit));

      return response.data;
    } catch (error) {
      console.error('MusicBrainz API error:', error);
      throw error;
    }
  }

  async searchRecordings(query: string, limit: number = 25): Promise<any[]> {
    try {
      const response: MusicBrainzResponse = await this.makeRequest('recording', {
        query,
        limit,
        inc: 'artist-credits+releases'
      });

      return response.recordings?.map(recording => ({
        id: recording.id,
        title: recording.title,
        score: recording.score,
        artists: recording['artist-credit']?.map(ac => ({
          name: ac.name,
          id: ac.artist.id
        })) || [],
        disambiguation: recording.disambiguation
      })) || [];
    } catch (error) {
      console.error('Error searching recordings:', error);
      return [];
    }
  }

  async searchArtists(query: string, limit: number = 25): Promise<any[]> {
    try {
      const response: MusicBrainzResponse = await this.makeRequest('artist', {
        query,
        limit
      });

      return response.artists?.map(artist => ({
        id: artist.id,
        name: artist.name,
        score: artist.score,
        disambiguation: artist.disambiguation
      })) || [];
    } catch (error) {
      console.error('Error searching artists:', error);
      return [];
    }
  }

  async searchReleases(query: string, limit: number = 25): Promise<any[]> {
    try {
      const response: MusicBrainzResponse = await this.makeRequest('release', {
        query,
        limit,
        inc: 'artist-credits'
      });

      return response.releases?.map(release => ({
        id: release.id,
        title: release.title,
        score: release.score,
        artists: release['artist-credit']?.map(ac => ({
          name: ac.name,
          id: ac.artist.id
        })) || [],
        disambiguation: release.disambiguation
      })) || [];
    } catch (error) {
      console.error('Error searching releases:', error);
      return [];
    }
  }

  async getRecordingDetails(recordingId: string): Promise<any | null> {
    try {
      const response = await this.makeRequest(`recording/${recordingId}`, {
        inc: 'artist-credits+releases+recording-rels+work-rels'
      });

      return {
        id: response.id,
        title: response.title,
        length: response.length,
        disambiguation: response.disambiguation,
        artists: response['artist-credit']?.map((ac: any) => ({
          name: ac.name,
          id: ac.artist.id
        })) || [],
        releases: response.releases?.map((release: any) => ({
          id: release.id,
          title: release.title,
          status: release.status,
          date: release.date
        })) || [],
        relationships: response.relations || []
      };
    } catch (error) {
      console.error('Error getting recording details:', error);
      return null;
    }
  }

  async getArtistDetails(artistId: string): Promise<any | null> {
    try {
      const response = await this.makeRequest(`artist/${artistId}`, {
        inc: 'artist-rels+work-rels+recording-rels'
      });

      return {
        id: response.id,
        name: response.name,
        type: response.type,
        gender: response.gender,
        country: response.country,
        'life-span': response['life-span'],
        disambiguation: response.disambiguation,
        relationships: response.relations || []
      };
    } catch (error) {
      console.error('Error getting artist details:', error);
      return null;
    }
  }

  async getReleaseDetails(releaseId: string): Promise<any | null> {
    try {
      const response = await this.makeRequest(`release/${releaseId}`, {
        inc: 'artist-credits+recordings+release-rels+media'
      });

      return {
        id: response.id,
        title: response.title,
        status: response.status,
        date: response.date,
        country: response.country,
        barcode: response.barcode,
        artists: response['artist-credit']?.map((ac: any) => ({
          name: ac.name,
          id: ac.artist.id
        })) || [],
        media: response.media?.map((medium: any) => ({
          format: medium.format,
          'track-count': medium['track-count'],
          tracks: medium.tracks?.map((track: any) => ({
            id: track.id,
            title: track.title,
            length: track.length,
            number: track.number,
            recording: track.recording
          })) || []
        })) || [],
        relationships: response.relations || []
      };
    } catch (error) {
      console.error('Error getting release details:', error);
      return null;
    }
  }

  // Helper method to find relationships of specific types
  findRelationships(relationships: any[], type: string): any[] {
    return relationships.filter(rel => 
      rel.type === type || rel['target-type'] === type
    );
  }

  // Extract personnel information from relationships
  extractPersonnel(relationships: any[]): any[] {
    const personnel: any[] = [];
    
    relationships.forEach(rel => {
      if (rel.artist) {
        personnel.push({
          name: rel.artist.name,
          id: rel.artist.id,
          role: rel.type,
          attributes: rel.attributes || [],
          begin: rel.begin,
          end: rel.end
        });
      }
    });

    return personnel;
  }
}

export const musicBrainzApi = new MusicBrainzApiService();