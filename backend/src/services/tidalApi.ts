import axios from 'axios';
import { config } from '../config/config';
import { CacheService } from '../config/redis';

export interface SongCredit {
  name: string;
  role: string;
  instrument?: string;
}

export interface SongResult {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration?: number;
  releaseDate?: string;
  credits: {
    songwriters: SongCredit[];
    producers: SongCredit[];
    musicians: SongCredit[];
    engineers: SongCredit[];
    miscellaneous: SongCredit[];
  };
}

export interface ArtistResult {
  id: string;
  name: string;
  bio?: string;
  imageUrl?: string;
  discography: {
    id: string;
    title: string;
    album: string;
    year: number;
    role: string;
  }[];
}

export interface AlbumResult {
  id: string;
  title: string;
  artist: string;
  releaseDate: string;
  totalTracks: number;
  personnel: SongCredit[];
  tracks: {
    id: string;
    title: string;
    trackNumber: number;
    credits: SongCredit[];
  }[];
}

class TidalApiService {
  private baseUrl = 'https://api.tidal.com'; // Note: This is not the actual TIDAL API
  private apiKey: string;

  constructor() {
    this.apiKey = config.tidalApiKey;
  }

  // Mock implementation - replace with actual TIDAL API when available
  async searchSongs(query: string, limit: number = 20): Promise<SongResult[]> {
    const cacheKey = `tidal:songs:${query}:${limit}`;
    
    // Check cache first
    const cached = await CacheService.getCachedApiResponse('tidal-songs', { query, limit });
    if (cached) {
      return cached;
    }

    // For now, return mock data since TIDAL doesn't have a public credits API
    const mockResults: SongResult[] = [
      {
        id: 'mock-1',
        title: 'Bohemian Rhapsody',
        artist: 'Queen',
        album: 'A Night at the Opera',
        duration: 355,
        releaseDate: '1975-10-31',
        credits: {
          songwriters: [
            { name: 'Freddie Mercury', role: 'Songwriter' }
          ],
          producers: [
            { name: 'Roy Thomas Baker', role: 'Producer' },
            { name: 'Queen', role: 'Producer' }
          ],
          musicians: [
            { name: 'Freddie Mercury', role: 'Musician', instrument: 'Vocals, Piano' },
            { name: 'Brian May', role: 'Musician', instrument: 'Guitar' },
            { name: 'Roger Taylor', role: 'Musician', instrument: 'Drums' },
            { name: 'John Deacon', role: 'Musician', instrument: 'Bass' }
          ],
          engineers: [
            { name: 'Mike Stone', role: 'Engineer' }
          ],
          miscellaneous: []
        }
      },
      {
        id: 'mock-2',
        title: 'Hotel California',
        artist: 'Eagles',
        album: 'Hotel California',
        duration: 391,
        releaseDate: '1976-12-08',
        credits: {
          songwriters: [
            { name: 'Don Felder', role: 'Songwriter' },
            { name: 'Don Henley', role: 'Songwriter' },
            { name: 'Glenn Frey', role: 'Songwriter' }
          ],
          producers: [
            { name: 'Bill Szymczyk', role: 'Producer' }
          ],
          musicians: [
            { name: 'Don Henley', role: 'Musician', instrument: 'Drums, Vocals' },
            { name: 'Glenn Frey', role: 'Musician', instrument: 'Guitar, Vocals' },
            { name: 'Joe Walsh', role: 'Musician', instrument: 'Guitar' },
            { name: 'Don Felder', role: 'Musician', instrument: 'Guitar' },
            { name: 'Timothy B. Schmit', role: 'Musician', instrument: 'Bass, Vocals' }
          ],
          engineers: [
            { name: 'Allan Blazek', role: 'Engineer' }
          ],
          miscellaneous: []
        }
      },
      {
        id: 'mock-3',
        title: 'For a Dancer',
        artist: 'Jackson Browne',
        album: 'Late for the Sky',
        duration: 246,
        releaseDate: '1974-09-01',
        credits: {
          songwriters: [
            { name: 'Jackson Browne', role: 'Songwriter' }
          ],
          producers: [
            { name: 'Al Schmitt', role: 'Producer' },
            { name: 'Jackson Browne', role: 'Producer' }
          ],
          musicians: [
            { name: 'Jackson Browne', role: 'Musician', instrument: 'Vocals, Piano, Guitar' },
            { name: 'David Lindley', role: 'Musician', instrument: 'Slide Guitar, Fiddle' },
            { name: 'Jai Winding', role: 'Musician', instrument: 'Piano, Organ' },
            { name: 'Leland Sklar', role: 'Musician', instrument: 'Bass' },
            { name: 'Russ Kunkel', role: 'Musician', instrument: 'Drums' }
          ],
          engineers: [
            { name: 'Al Schmitt', role: 'Engineer' },
            { name: 'Doug Sax', role: 'Mastering Engineer' }
          ],
          miscellaneous: []
        }
      },
      {
        id: 'mock-4',
        title: 'Imagine',
        artist: 'John Lennon',
        album: 'Imagine',
        duration: 183,
        releaseDate: '1971-09-09',
        credits: {
          songwriters: [
            { name: 'John Lennon', role: 'Songwriter' },
            { name: 'Yoko Ono', role: 'Co-songwriter' }
          ],
          producers: [
            { name: 'John Lennon', role: 'Producer' },
            { name: 'Yoko Ono', role: 'Producer' },
            { name: 'Phil Spector', role: 'Producer' }
          ],
          musicians: [
            { name: 'John Lennon', role: 'Musician', instrument: 'Vocals, Piano' },
            { name: 'Klaus Voormann', role: 'Musician', instrument: 'Bass' },
            { name: 'Alan White', role: 'Musician', instrument: 'Drums' },
            { name: 'The Flux Fiddlers', role: 'Musician', instrument: 'Strings' }
          ],
          engineers: [
            { name: 'Phil McDonald', role: 'Engineer' },
            { name: 'John Smith', role: 'Engineer' }
          ],
          miscellaneous: []
        }
      },
      {
        id: 'mock-5',
        title: 'Stairway to Heaven',
        artist: 'Led Zeppelin',
        album: 'Led Zeppelin IV',
        duration: 482,
        releaseDate: '1971-11-08',
        credits: {
          songwriters: [
            { name: 'Jimmy Page', role: 'Songwriter' },
            { name: 'Robert Plant', role: 'Songwriter' }
          ],
          producers: [
            { name: 'Jimmy Page', role: 'Producer' }
          ],
          musicians: [
            { name: 'Robert Plant', role: 'Musician', instrument: 'Vocals' },
            { name: 'Jimmy Page', role: 'Musician', instrument: 'Acoustic Guitar, Electric Guitar' },
            { name: 'John Paul Jones', role: 'Musician', instrument: 'Bass, Recorders' },
            { name: 'John Bonham', role: 'Musician', instrument: 'Drums' }
          ],
          engineers: [
            { name: 'Andy Johns', role: 'Engineer' }
          ],
          miscellaneous: []
        }
      }
    ];

    // Filter results based on query
    const filteredResults = mockResults.filter(song => 
      song.title.toLowerCase().includes(query.toLowerCase()) ||
      song.artist.toLowerCase().includes(query.toLowerCase()) ||
      song.album.toLowerCase().includes(query.toLowerCase())
    );

    // Cache the results for 1 hour
    await CacheService.cacheApiResponse('tidal-songs', { query, limit }, filteredResults, 3600);

    return filteredResults.slice(0, limit);
  }

  async searchArtists(query: string, limit: number = 20): Promise<ArtistResult[]> {
    const cacheKey = `tidal:artists:${query}:${limit}`;
    
    const cached = await CacheService.getCachedApiResponse('tidal-artists', { query, limit });
    if (cached) {
      return cached;
    }

    // Mock data for artists
    const mockResults: ArtistResult[] = [
      {
        id: 'artist-1',
        name: 'Freddie Mercury',
        bio: 'British singer and songwriter, lead vocalist of Queen',
        discography: [
          {
            id: 'song-1',
            title: 'Bohemian Rhapsody',
            album: 'A Night at the Opera',
            year: 1975,
            role: 'Songwriter, Vocalist'
          },
          {
            id: 'song-2',
            title: 'We Are the Champions',
            album: 'News of the World',
            year: 1977,
            role: 'Songwriter, Vocalist'
          }
        ]
      }
    ];

    const filteredResults = mockResults.filter(artist => 
      artist.name.toLowerCase().includes(query.toLowerCase())
    );

    await CacheService.cacheApiResponse('tidal-artists', { query, limit }, filteredResults, 3600);
    return filteredResults.slice(0, limit);
  }

  async searchAlbums(query: string, limit: number = 20): Promise<AlbumResult[]> {
    const cached = await CacheService.getCachedApiResponse('tidal-albums', { query, limit });
    if (cached) {
      return cached;
    }

    // Mock data for albums
    const mockResults: AlbumResult[] = [
      {
        id: 'album-1',
        title: 'A Night at the Opera',
        artist: 'Queen',
        releaseDate: '1975-10-31',
        totalTracks: 12,
        personnel: [
          { name: 'Roy Thomas Baker', role: 'Producer' },
          { name: 'Mike Stone', role: 'Engineer' },
          { name: 'Queen', role: 'Producer' }
        ],
        tracks: [
          {
            id: 'track-1',
            title: 'Bohemian Rhapsody',
            trackNumber: 1,
            credits: [
              { name: 'Freddie Mercury', role: 'Songwriter' },
              { name: 'Freddie Mercury', role: 'Vocalist' }
            ]
          }
        ]
      }
    ];

    const filteredResults = mockResults.filter(album => 
      album.title.toLowerCase().includes(query.toLowerCase()) ||
      album.artist.toLowerCase().includes(query.toLowerCase())
    );

    await CacheService.cacheApiResponse('tidal-albums', { query, limit }, filteredResults, 3600);
    return filteredResults.slice(0, limit);
  }

  // Get detailed information about a specific song
  async getSongDetails(songId: string): Promise<SongResult | null> {
    const cached = await CacheService.getCachedApiResponse('tidal-song-details', { songId });
    if (cached) {
      return cached;
    }

    // In a real implementation, this would make an API call to get detailed song information
    // For now, return null if not found in mock data
    const mockSong = await this.searchSongs(''); // Get all mock songs
    const song = mockSong.find(s => s.id === songId);

    if (song) {
      await CacheService.cacheApiResponse('tidal-song-details', { songId }, song, 7200); // Cache for 2 hours
    }

    return song || null;
  }

  // Search for a person (producer, musician, songwriter, etc.)
  async searchPerson(query: string, role?: string): Promise<any[]> {
    const cached = await CacheService.getCachedApiResponse('tidal-person', { query, role });
    if (cached) {
      return cached;
    }

    // Mock implementation - search across all credits
    const allSongs = await this.searchSongs('');
    const people = new Map();

    allSongs.forEach(song => {
      Object.values(song.credits).flat().forEach(credit => {
        if (credit.name.toLowerCase().includes(query.toLowerCase())) {
          if (!role || credit.role.toLowerCase().includes(role.toLowerCase())) {
            const key = credit.name;
            if (!people.has(key)) {
              people.set(key, {
                name: credit.name,
                roles: new Set(),
                songs: []
              });
            }
            people.get(key).roles.add(credit.role);
            people.get(key).songs.push({
              id: song.id,
              title: song.title,
              artist: song.artist,
              album: song.album,
              role: credit.role,
              instrument: credit.instrument
            });
          }
        }
      });
    });

    const results = Array.from(people.values()).map(person => ({
      ...person,
      roles: Array.from(person.roles)
    }));

    await CacheService.cacheApiResponse('tidal-person', { query, role }, results, 3600);
    return results;
  }
}

export const tidalApi = new TidalApiService();