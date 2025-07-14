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
  private rateLimit = 1100; // 1.1 seconds between requests for safety margin
  private lastRequestTime = 0;

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
      // Simple rate limiting - wait 1.1 seconds between requests
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.rateLimit) {
        const waitTime = this.rateLimit - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      const response = await axios.get(`${this.baseUrl}/${endpoint}`, {
        params: {
          ...params,
          fmt: 'json'
        },
        headers: {
          'User-Agent': this.userAgent
        },
        timeout: 10000
      });

      // Cache for 48 hours
      await CacheService.set(cacheKey, JSON.stringify(response.data), 172800);

      this.lastRequestTime = Date.now();
      return response.data;
    } catch (error: any) {
      // Handle rate limit errors specifically
      if (error.response?.status === 503 || error.response?.status === 429) {
        console.warn('MusicBrainz rate limit hit, retrying after extended delay...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        throw new Error('Rate limit exceeded - please try again later');
      }
      
      console.error('MusicBrainz API error:', error.message);
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

      // Format recordings with basic info only for search results
      const results = (response.recordings || []).slice(0, limit).map((recording) => {
        return this.formatBasicRecording(recording, query);
      });

      return results.filter(result => result !== null);
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
        inc: 'artist-credits+releases+recording-rels+work-rels+release-rels'
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
          date: release.date,
          relationships: release.relations || []
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

  // Format recording for search results with credits
  private formatRecordingForSearch(recording: any, query: string): any {
    if (!recording) return null;

    const credits = this.extractCreditsFromRecording(recording);
    
    // Get release information
    const release = recording.releases?.[0];
    
    return {
      id: `mb-${recording.id}`,
      title: recording.title,
      artist: recording['artist-credit']?.map((ac: any) => ac.name).join(', ') || 'Unknown Artist',
      album: release?.title || 'Unknown Album',
      year: release?.date ? new Date(release.date).getFullYear() : undefined,
      releaseDate: release?.date,
      duration: recording.length ? Math.floor(recording.length / 1000) : undefined,
      credits: credits,
      source: 'musicbrainz',
      musicbrainzId: recording.id,
      disambiguation: recording.disambiguation
    };
  }

  // Format basic recording without detailed credits
  private formatBasicRecording(recording: any, query: string): any {
    // Get release information
    const release = recording.releases?.[0];
    
    return {
      id: `mb-${recording.id}`,
      title: recording.title,
      artist: recording['artist-credit']?.map((ac: any) => ac.name).join(', ') || 'Unknown Artist',
      album: release?.title || 'Unknown Album',
      year: release?.date ? new Date(release.date).getFullYear() : undefined,
      releaseDate: release?.date,
      duration: recording.length ? Math.floor(recording.length / 1000) : undefined,
      source: 'musicbrainz',
      musicbrainzId: recording.id,
      disambiguation: recording.disambiguation,
      credits: {
        songwriters: [],
        producers: [],
        musicians: [],
        engineers: [],
        miscellaneous: []
      }
    };
  }

  // Extract credits from MusicBrainz recording data
  private extractCreditsFromRecording(recording: any): any {
    const credits = {
      songwriters: [] as any[],
      producers: [] as any[],
      musicians: [] as any[],
      engineers: [] as any[],
      miscellaneous: [] as any[]
    };

    // Process recording-level relationships for credits (performers, etc.)
    if (recording.relationships) {
      recording.relationships.forEach((rel: any) => {
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
        
        // Handle work relationships for songwriting credits
        if (rel.work && rel.type === 'performance') {
          // For now, we can add a placeholder indicating this song has composer/lyricist info available
          // but would need another API call to get it. We can implement this as a "load more credits" feature
          if (rel.work.title && credits.songwriters.length === 0) {
            credits.miscellaneous.push({
              name: `Work: ${rel.work.title}`,
              role: 'Composition/Lyrics info available',
              attributes: 'Click for detailed credits'
            });
          }
        }
      });
    }

    // Remove duplicates
    Object.keys(credits).forEach(key => {
      credits[key as keyof typeof credits] = credits[key as keyof typeof credits].filter((credit, index, self) =>
        index === self.findIndex(c => c.name === credit.name && c.role === credit.role)
      );
    });

    return credits;
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

  // Extract enhanced credits including work relationships for composer/lyricist info
  async extractEnhancedCredits(recordingDetails: any): Promise<any> {
    const credits = {
      songwriters: [] as any[],
      producers: [] as any[],
      musicians: [] as any[],
      engineers: [] as any[],
      miscellaneous: [] as any[]
    };

    // Extract recording-level relationships (performers, producers, engineers)
    if (recordingDetails.relationships) {
      for (const rel of recordingDetails.relationships) {
        if (rel.artist) {
          const credit = {
            name: rel.artist.name,
            role: rel.type || 'Contributor',
            attributes: rel.attributes?.join(', ') || undefined,
            begin: rel.begin,
            end: rel.end
          };

          const roleType = rel.type?.toLowerCase() || '';
          
          if (roleType.includes('producer')) {
            credits.producers.push(credit);
          } else if (roleType.includes('performer') || roleType.includes('vocal') || roleType.includes('instrument')) {
            credits.musicians.push({
              ...credit,
              instrument: rel.attributes?.join(', ') || rel.type
            });
          } else if (roleType.includes('engineer') || roleType.includes('mix') || roleType.includes('master') || roleType.includes('recording')) {
            credits.engineers.push(credit);
          } else if (roleType.includes('composer') || roleType.includes('lyricist') || roleType.includes('writer')) {
            credits.songwriters.push(credit);
          } else {
            credits.miscellaneous.push(credit);
          }
        }

        // Handle work relationships - fetch detailed work credits
        if (rel.work && rel.type === 'performance') {
          try {
            console.log(`🎵 Fetching work details for: ${rel.work.title} (${rel.work.id})`);
            const workDetails = await this.getWorkDetails(rel.work.id);
            
            if (workDetails && workDetails.relationships) {
              workDetails.relationships.forEach((workRel: any) => {
                if (workRel.artist) {
                  const workCredit = {
                    name: workRel.artist.name,
                    role: workRel.type || 'Contributor',
                    attributes: workRel.attributes?.join(', ') || undefined,
                    workTitle: rel.work.title
                  };

                  const workRoleType = workRel.type?.toLowerCase() || '';
                  
                  if (workRoleType.includes('composer') || workRoleType.includes('lyricist') || workRoleType.includes('writer')) {
                    credits.songwriters.push(workCredit);
                  } else if (workRoleType.includes('arranger')) {
                    credits.miscellaneous.push({
                      ...workCredit,
                      role: `${workCredit.role} (${rel.work.title})`
                    });
                  } else {
                    credits.miscellaneous.push({
                      ...workCredit,
                      role: `${workCredit.role} (${rel.work.title})`
                    });
                  }
                }
              });
            }
          } catch (error) {
            console.warn(`⚠️ Could not fetch work details for ${rel.work.id}:`, error);
            // Fallback to placeholder
            credits.miscellaneous.push({
              name: `Work: ${rel.work.title}`,
              role: 'Composition/Lyrics (Work)',
              attributes: 'Work details unavailable',
              workId: rel.work.id
            });
          }
        }
      }
    }

    // Extract additional information from releases if available
    if (recordingDetails.releases) {
      recordingDetails.releases.forEach((release: any) => {
        if (release.relationships) {
          release.relationships.forEach((rel: any) => {
            if (rel.artist && rel.type) {
              const roleType = rel.type.toLowerCase();
              const releaseCredit = {
                name: rel.artist.name,
                role: rel.type,
                attributes: rel.attributes?.join(', ') || 'Release-level credit',
                releaseContext: release.title
              };
              
              if (roleType.includes('producer')) {
                credits.producers.push(releaseCredit);
              } else if (roleType.includes('engineer') || roleType.includes('mix') || roleType.includes('master')) {
                credits.engineers.push(releaseCredit);
              } else if (roleType.includes('label') || roleType.includes('distributed')) {
                credits.miscellaneous.push(releaseCredit);
              } else if (roleType.includes('performer') || roleType.includes('instrument') || roleType.includes('vocal')) {
                credits.musicians.push({
                  ...releaseCredit,
                  instrument: rel.attributes?.join(', ') || rel.type
                });
              } else {
                credits.miscellaneous.push(releaseCredit);
              }
            }
          });
        }
      });
    }

    // Remove duplicates
    Object.keys(credits).forEach(key => {
      credits[key as keyof typeof credits] = credits[key as keyof typeof credits].filter((credit, index, self) =>
        index === self.findIndex(c => c.name === credit.name && c.role === credit.role)
      );
    });

    return credits;
  }

  // Get work details to fetch composer/lyricist information
  async getWorkDetails(workId: string): Promise<any | null> {
    try {
      const response = await this.makeRequest(`work/${workId}`, {
        inc: 'artist-rels'
      });

      return {
        id: response.id,
        title: response.title,
        type: response.type,
        relationships: response.relations || []
      };
    } catch (error) {
      console.error('Error getting work details:', error);
      return null;
    }
  }
}

export const musicBrainzApi = new MusicBrainzApiService();