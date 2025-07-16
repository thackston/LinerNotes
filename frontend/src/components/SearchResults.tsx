import React from 'react';
import DOMPurify from 'dompurify';
import { apiService } from '../services/api';

// Utility function to sanitize text content
const sanitizeText = (text: any): string => {
  if (!text) return '';
  return DOMPurify.sanitize(String(text), { ALLOWED_TAGS: [] });
};

interface SearchResultsProps {
  results: any[];
  loading: boolean;
  error: string | null;
  searchType: 'songs' | 'artists' | 'albums' | 'people';
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  loading,
  error,
  searchType
}) => {
  // Debug logging
  console.log('🔍 SearchResults received:', { results, loading, error, searchType });
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Searching...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-2">Search failed</div>
        <div className="text-gray-500 text-sm">{error}</div>
      </div>
    );
  }

  // Defensive programming: ensure results is an array
  if (!Array.isArray(results)) {
    console.error('❌ SearchResults: results is not an array:', typeof results, results);
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-2">Invalid search results</div>
        <div className="text-gray-500 text-sm">The server returned an unexpected format</div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">No results found</div>
        <div className="text-sm text-gray-400 mt-1">Try a different search term</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600">
        {results.length} {searchType} found
      </div>
      <div className="grid gap-4">
        {results.map((result, index) => (
          <ResultCard key={result.id || index} result={result} searchType={searchType} />
        ))}
      </div>
    </div>
  );
};

interface ResultCardProps {
  result: any;
  searchType: string;
}

const ResultCard: React.FC<ResultCardProps> = ({ result, searchType }) => {
  switch (searchType) {
    case 'songs':
      return <SongCard song={result} />;
    case 'artists':
      return <ArtistCard artist={result} />;
    case 'albums':
      return <AlbumCard album={result} />;
    case 'people':
      return <PersonCard person={result} />;
    default:
      return null;
  }
};

const SongCard: React.FC<{ song: any }> = ({ song }) => {
  const [loadingCredits, setLoadingCredits] = React.useState(false);
  const [fullCredits, setFullCredits] = React.useState<any>(null);

  const loadFullCredits = async () => {
    if ((!song.musicbrainzId && !song.id) || loadingCredits) return;
    
    setLoadingCredits(true);
    try {
      const songId = song.id || song.musicbrainzId;
      const data = await apiService.getSongCredits(songId);
      setFullCredits(data.credits);
    } catch (error) {
      console.error('Failed to load full credits:', error);
    } finally {
      setLoadingCredits(false);
    }
  };

  // Always preserve original songwriter information for the "Written by" section
  const originalSongwriters = song.credits?.songwriters || [];
  
  // For the detailed credits section, merge original and full credits
  const displayCredits = fullCredits ? {
    songwriters: fullCredits.songwriters && fullCredits.songwriters.length > 0 ? fullCredits.songwriters : originalSongwriters,
    producers: fullCredits.producers || song.credits?.producers || [],
    musicians: fullCredits.musicians || song.credits?.musicians || [],
    engineers: fullCredits.engineers || song.credits?.engineers || [],
    miscellaneous: fullCredits.miscellaneous || song.credits?.miscellaneous || []
  } : song.credits;
  
  // Debug logging for songwriter information
  React.useEffect(() => {
    if (displayCredits?.songwriters) {
      console.log(`🎼 Song "${song.title}" songwriters:`, displayCredits.songwriters);
    } else {
      console.log(`❌ No songwriters for "${song.title}"`, { displayCredits });
    }
  }, [displayCredits, song.title]);
  const hasBasicCredits = song.credits && (
    song.credits.songwriters?.length > 0 ||
    song.credits.producers?.length > 0 ||
    song.credits.musicians?.length > 0 ||
    song.credits.engineers?.length > 0 ||
    song.credits.miscellaneous?.length > 0
  );
  
  // Show credits section if we have credits OR if it's a MusicBrainz song (for Load Credits button)
  const shouldShowCreditsSection = hasBasicCredits || (song.source === 'musicbrainz' && (song.musicbrainzId || song.id));

  return (
  <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-gray-900">{sanitizeText(song.title || song.name || '').substring(0, 200)}</h3>
          
          {/* Priority Score and Best Match Indicator */}
          {song.priorityScore && song.priorityScore >= 2000 && (
            <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800 font-medium">
              ⭐ Best Match
            </span>
          )}
          {song.priorityScore && song.priorityScore >= 1500 && song.priorityScore < 2000 && (
            <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
              Good Match
            </span>
          )}
          
          {/* Cached indicator */}
          {song.cached && (
            <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
              🚀 Fast
            </span>
          )}
          
          {song.source && (
            <span className={`text-xs px-2 py-1 rounded ${
              song.source === 'musicbrainz' ? 'bg-green-100 text-green-800' :
              song.source === 'discogs' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {song.source === 'musicbrainz' ? 'MusicBrainz' : 
               song.source === 'discogs' ? 'Discogs' : 
               song.source}
            </span>
          )}
        </div>
        <p className="text-gray-600">{sanitizeText(song.artist || '').substring(0, 150)}</p>
        <p className="text-sm text-gray-500">{sanitizeText(song.album || '').substring(0, 150)} {song.releaseDate && `(${new Date(song.releaseDate).getFullYear()})`}</p>
        
        {/* Songwriter display with confidence indicators */}
        {originalSongwriters && originalSongwriters.length > 0 ? (
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600">✍️ Written by:</span>
              <div className="flex flex-wrap gap-1">
                {originalSongwriters.slice(0, 3).map((credit: any, idx: number) => {
                  const isLowConfidence = credit.confidence === 'low' || credit.role?.includes('unavailable');
                  return (
                    <span 
                      key={idx} 
                      className={`text-sm font-medium px-2 py-1 rounded ${
                        isLowConfidence 
                          ? 'text-amber-700 bg-amber-50 border border-amber-200' 
                          : 'text-blue-700 bg-blue-50'
                      }`}
                    >
                      {sanitizeText(credit.name || '').substring(0, 100)}
                      {isLowConfidence && <span className="ml-1 text-xs">⚠️</span>}
                    </span>
                  );
                })}
                {originalSongwriters.length > 3 && (
                  <span className="text-xs text-gray-500">+{originalSongwriters.length - 3} more</span>
                )}
              </div>
            </div>
            {/* Data confidence indicator */}
            {song.credits?.dataConfidence?.songwriters === 'low' && (
              <div className="mt-1 text-xs text-amber-600">
                ⚠️ Songwriter data unavailable - showing performer information
              </div>
            )}
            {song.credits?.dataConfidence?.songwriters === 'unknown' && originalSongwriters.length === 0 && (
              <div className="mt-1 text-xs text-gray-500">
                ℹ️ Songwriter information not available in database
              </div>
            )}
          </div>
        ) : (
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600">✍️ Written by:</span>
              <span className="text-sm text-gray-500 italic">Songwriter information not available</span>
            </div>
          </div>
        )}
        
        {/* Development mode: Show scoring details */}
        {process.env.NODE_ENV === 'development' && song.priorityScore && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
            <div className="text-gray-700">
              <strong>Score:</strong> {song.priorityScore}
              {song.scoringReason && (
                <span className="ml-2 text-gray-600">• {song.scoringReason}</span>
              )}
            </div>
          </div>
        )}
        
        {shouldShowCreditsSection && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-700">Credits:</p>
              {(song.musicbrainzId || song.id) && song.source === 'musicbrainz' && !fullCredits && (
                <button
                  onClick={loadFullCredits}
                  disabled={loadingCredits}
                  className="text-xs bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-2 py-1 rounded transition-colors"
                >
                  {loadingCredits ? 'Loading...' : 'Load Full Credits'}
                </button>
              )}
            </div>
            <div className="space-y-2">
              {/* Songwriters */}
              {displayCredits.songwriters && displayCredits.songwriters.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Songwriters:</p>
                  <div className="flex flex-wrap gap-1">
                    {displayCredits.songwriters.map((credit: any, idx: number) => (
                      <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {sanitizeText(credit.name || '').substring(0, 100)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Producers */}
              {displayCredits.producers && displayCredits.producers.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Producers:</p>
                  <div className="flex flex-wrap gap-1">
                    {displayCredits.producers.map((credit: any, idx: number) => (
                      <span key={idx} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        {sanitizeText(credit.name || '').substring(0, 100)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Musicians */}
              {displayCredits.musicians && displayCredits.musicians.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Musicians:</p>
                  <div className="flex flex-wrap gap-1">
                    {displayCredits.musicians.map((credit: any, idx: number) => (
                      <span key={idx} className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        {sanitizeText(credit.name || '').substring(0, 80)} {credit.instrument && `(${sanitizeText(credit.instrument).substring(0, 50)})`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Engineers */}
              {displayCredits.engineers && displayCredits.engineers.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Engineers:</p>
                  <div className="flex flex-wrap gap-1">
                    {displayCredits.engineers.map((credit: any, idx: number) => (
                      <span key={idx} className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                        {sanitizeText(credit.name || '').substring(0, 100)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Miscellaneous */}
              {displayCredits.miscellaneous && displayCredits.miscellaneous.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Other Credits:</p>
                  <div className="flex flex-wrap gap-1">
                    {displayCredits.miscellaneous.map((credit: any, idx: number) => (
                      <span key={idx} className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                        {sanitizeText(credit.name || '').substring(0, 100)}
                        {credit.role && credit.role !== credit.name && (
                          <span className="text-gray-600"> • {sanitizeText(credit.role || '').substring(0, 50)}</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {song.artists && (
          <p className="text-gray-600 mt-2">{song.artists.map((a: any) => sanitizeText(a.name)).join(', ')}</p>
        )}
      </div>
      {song.duration && (
        <div className="text-sm text-gray-500">
          {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
        </div>
      )}
    </div>
  </div>
  );
};

const ArtistCard: React.FC<{ artist: any }> = ({ artist }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
    <div className="flex items-start space-x-3">
      {artist.imageUrl && (
        <img src={artist.imageUrl} alt={sanitizeText(artist.name)} className="w-12 h-12 rounded-full object-cover" />
      )}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-gray-900">{sanitizeText(artist.name)}</h3>
          {artist.source && (
            <span className={`text-xs px-2 py-1 rounded ${
              artist.source === 'musicbrainz' ? 'bg-green-100 text-green-800' :
              artist.source === 'discogs' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {artist.source === 'musicbrainz' ? 'MusicBrainz' : 
               artist.source === 'discogs' ? 'Discogs' : 
               artist.source}
            </span>
          )}
        </div>
        {artist.genres && artist.genres.length > 0 && (
          <p className="text-sm text-gray-600">{artist.genres.map((genre: any) => sanitizeText(genre)).join(', ')}</p>
        )}
        {artist.bio && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{sanitizeText(artist.bio)}</p>
        )}
        {artist.disambiguation && (
          <p className="text-xs text-gray-400 mt-1">{sanitizeText(artist.disambiguation)}</p>
        )}
      </div>
    </div>
  </div>
);

const AlbumCard: React.FC<{ album: any }> = ({ album }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
    <div className="flex items-start space-x-3">
      {album.imageUrl && (
        <img src={album.imageUrl} alt={sanitizeText(album.name || album.title)} className="w-12 h-12 rounded object-cover" />
      )}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-gray-900">{sanitizeText(album.name || album.title)}</h3>
          {album.source && (
            <span className={`text-xs px-2 py-1 rounded ${
              album.source === 'musicbrainz' ? 'bg-green-100 text-green-800' :
              album.source === 'discogs' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {album.source === 'musicbrainz' ? 'MusicBrainz' : 
               album.source === 'discogs' ? 'Discogs' : 
               album.source}
            </span>
          )}
        </div>
        <p className="text-gray-600">{sanitizeText(album.artist) || album.artists?.map((a: any) => sanitizeText(a.name)).join(', ')}</p>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          {album.year && <span>{album.year}</span>}
          {album.releaseDate && <span>{new Date(album.releaseDate).getFullYear()}</span>}
          {album.trackCount && <span>• {album.trackCount} tracks</span>}
        </div>
        {album.disambiguation && (
          <p className="text-xs text-gray-400 mt-1">{sanitizeText(album.disambiguation)}</p>
        )}
      </div>
    </div>
  </div>
);

const PersonCard: React.FC<{ person: any }> = ({ person }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
    <div>
      <div className="flex items-center gap-2 mb-1">
        <h3 className="font-semibold text-gray-900">{sanitizeText(person.name)}</h3>
        {person.source && (
          <span className={`text-xs px-2 py-1 rounded ${
            person.source === 'musicbrainz' ? 'bg-green-100 text-green-800' :
            person.source === 'discogs' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {person.source === 'musicbrainz' ? 'MusicBrainz' : 
             person.source === 'discogs' ? 'Discogs' : 
             person.source}
          </span>
        )}
      </div>
      {person.roles && person.roles.length > 0 && (
        <div className="mt-1">
          <div className="flex flex-wrap gap-1">
            {person.roles.map((role: string, idx: number) => (
              <span key={idx} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                {sanitizeText(role)}
              </span>
            ))}
          </div>
        </div>
      )}
      {person.knownFor && person.knownFor.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-gray-500 mb-1">Known for:</p>
          <p className="text-sm text-gray-600">{person.knownFor.slice(0, 2).map((item: any) => sanitizeText(item)).join(', ')}</p>
        </div>
      )}
      {person.disambiguation && (
        <p className="text-xs text-gray-400 mt-1">{sanitizeText(person.disambiguation)}</p>
      )}
    </div>
  </div>
);