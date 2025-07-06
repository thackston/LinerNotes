import React from 'react';

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

const SongCard: React.FC<{ song: any }> = ({ song }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900">{String(song.title || song.name || '').substring(0, 200)}</h3>
        <p className="text-gray-600">{String(song.artist || '').substring(0, 150)}</p>
        <p className="text-sm text-gray-500">{String(song.album || '').substring(0, 150)} {song.releaseDate && `(${new Date(song.releaseDate).getFullYear()})`}</p>
        
        {song.credits && (
          <div className="mt-3">
            <p className="text-xs font-medium text-gray-700 mb-2">Credits:</p>
            <div className="space-y-2">
              {/* Songwriters */}
              {song.credits.songwriters && song.credits.songwriters.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Songwriters:</p>
                  <div className="flex flex-wrap gap-1">
                    {song.credits.songwriters.map((credit: any, idx: number) => (
                      <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {String(credit.name || '').substring(0, 100)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Producers */}
              {song.credits.producers && song.credits.producers.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Producers:</p>
                  <div className="flex flex-wrap gap-1">
                    {song.credits.producers.map((credit: any, idx: number) => (
                      <span key={idx} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        {String(credit.name || '').substring(0, 100)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Musicians */}
              {song.credits.musicians && song.credits.musicians.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Musicians:</p>
                  <div className="flex flex-wrap gap-1">
                    {song.credits.musicians.map((credit: any, idx: number) => (
                      <span key={idx} className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        {String(credit.name || '').substring(0, 80)} {credit.instrument && `(${String(credit.instrument).substring(0, 50)})`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Engineers */}
              {song.credits.engineers && song.credits.engineers.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Engineers:</p>
                  <div className="flex flex-wrap gap-1">
                    {song.credits.engineers.map((credit: any, idx: number) => (
                      <span key={idx} className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                        {String(credit.name || '').substring(0, 100)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {song.artists && (
          <p className="text-gray-600 mt-2">{song.artists.map((a: any) => a.name).join(', ')}</p>
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

const ArtistCard: React.FC<{ artist: any }> = ({ artist }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
    <div className="flex items-start space-x-3">
      {artist.imageUrl && (
        <img src={artist.imageUrl} alt={artist.name} className="w-12 h-12 rounded-full object-cover" />
      )}
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900">{artist.name}</h3>
        {artist.genres && artist.genres.length > 0 && (
          <p className="text-sm text-gray-600">{artist.genres.join(', ')}</p>
        )}
        {artist.bio && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{artist.bio}</p>
        )}
        {artist.disambiguation && (
          <p className="text-xs text-gray-400 mt-1">{artist.disambiguation}</p>
        )}
      </div>
    </div>
  </div>
);

const AlbumCard: React.FC<{ album: any }> = ({ album }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
    <div className="flex items-start space-x-3">
      {album.imageUrl && (
        <img src={album.imageUrl} alt={album.name || album.title} className="w-12 h-12 rounded object-cover" />
      )}
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900">{album.name || album.title}</h3>
        <p className="text-gray-600">{album.artist || album.artists?.map((a: any) => a.name).join(', ')}</p>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          {album.year && <span>{album.year}</span>}
          {album.releaseDate && <span>{new Date(album.releaseDate).getFullYear()}</span>}
          {album.trackCount && <span>• {album.trackCount} tracks</span>}
        </div>
        {album.disambiguation && (
          <p className="text-xs text-gray-400 mt-1">{album.disambiguation}</p>
        )}
      </div>
    </div>
  </div>
);

const PersonCard: React.FC<{ person: any }> = ({ person }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
    <div>
      <h3 className="font-semibold text-gray-900">{person.name}</h3>
      {person.roles && person.roles.length > 0 && (
        <div className="mt-1">
          <div className="flex flex-wrap gap-1">
            {person.roles.map((role: string, idx: number) => (
              <span key={idx} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                {role}
              </span>
            ))}
          </div>
        </div>
      )}
      {person.knownFor && person.knownFor.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-gray-500 mb-1">Known for:</p>
          <p className="text-sm text-gray-600">{person.knownFor.slice(0, 2).join(', ')}</p>
        </div>
      )}
      {person.disambiguation && (
        <p className="text-xs text-gray-400 mt-1">{person.disambiguation}</p>
      )}
    </div>
  </div>
);