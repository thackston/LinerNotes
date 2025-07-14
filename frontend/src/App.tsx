import React, { useState, useCallback } from 'react';
import { apiService } from './services/api';
import { SearchResults } from './components/SearchResults';

type SearchType = 'songs' | 'artists' | 'albums' | 'people';

function App() {
  const [query, setQuery] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('songs');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchMetadata, setSearchMetadata] = useState<any>(null);

  const handleSearch = useCallback(async () => {
    // For songs, check if we have at least a song title or combined query
    if (searchType === 'songs') {
      if (!songTitle.trim() && !query.trim()) return;
    } else {
      if (!query.trim()) return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      let response;
      switch (searchType) {
        case 'songs':
          // Use separate fields if available, otherwise fall back to combined query
          if (songTitle.trim() || artistName.trim()) {
            response = await apiService.searchSongsWithFields(songTitle.trim(), artistName.trim());
          } else {
            response = await apiService.searchSongs(query);
          }
          break;
        case 'artists':
          response = await apiService.searchArtists(query);
          break;
        case 'albums':
          response = await apiService.searchAlbums(query);
          break;
        case 'people':
          response = await apiService.searchPeople(query);
          break;
      }

      // Debug: Log the actual response structure
      console.log('🔍 Raw API response:', response);
      
      // Handle different response formats
      if (searchType === 'songs') {
        // Enhanced search response - flat results array
        const enhancedResponse = response as any;
        const results = enhancedResponse.results || [];
        
        console.log('🎵 Enhanced search results:', results);
        
        // Ensure results is an array
        if (Array.isArray(results)) {
          setResults(results);
        } else {
          console.error('❌ Results is not an array:', typeof results, results);
          setResults([]);
          setError('Invalid response format from server');
          return;
        }
        
        setSearchMetadata({
          cached: enhancedResponse.cached,
          searchTime: enhancedResponse.searchTime,
          totalCount: enhancedResponse.totalCount,
          sources: enhancedResponse.sources,
          primary_source: enhancedResponse.primary_source
        });
        
        // Log cache performance in development
        if (process.env.NODE_ENV === 'development' && enhancedResponse.cached !== undefined) {
          console.log(`🔍 Search completed: ${enhancedResponse.cached ? 'Cache HIT' : 'Cache MISS'}`, 
                     enhancedResponse.searchTime ? `${enhancedResponse.searchTime}ms` : '');
        }
      } else {
        // Legacy search response - combine primary and supplementary
        const legacyResponse = response as any;
        const combinedResults = [
          ...(legacyResponse.results?.primary || []), 
          ...(legacyResponse.results?.supplementary || [])
        ];
        setResults(combinedResults);
        setSearchMetadata(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, songTitle, artistName, searchType]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Liner Notes Discovery</h1>
          <p className="mt-2 text-gray-600">Discover the hidden stories behind your favorite songs</p>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Search for Songs, Artists, or Albums</h2>
          
          <div className="mb-4">
            <div className="flex space-x-2">
              {(['songs', 'artists', 'albums', 'people'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSearchType(type)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    searchType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {searchType === 'songs' ? (
            // Enhanced song search with separate fields
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="songTitle" className="block text-sm font-medium text-gray-700 mb-1">
                    Song Title *
                  </label>
                  <input
                    id="songTitle"
                    type="text"
                    placeholder="e.g., Hotel California"
                    value={songTitle}
                    onChange={(e) => setSongTitle(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="artistName" className="block text-sm font-medium text-gray-700 mb-1">
                    Artist <span className="text-gray-500">(optional)</span>
                  </label>
                  <input
                    id="artistName"
                    type="text"
                    placeholder="e.g., Eagles"
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                <strong>💡 Tip:</strong> Use separate fields for better results, or try the combined search below
              </div>
              
              {/* Fallback to combined search */}
              <div>
                <label htmlFor="combinedQuery" className="block text-sm font-medium text-gray-500 mb-1">
                  Or search with combined text:
                </label>
                <div className="flex space-x-2">
                  <input
                    id="combinedQuery"
                    type="text"
                    placeholder="e.g., Hotel California Eagles"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  />
                </div>
              </div>
              
              <button 
                onClick={handleSearch}
                disabled={loading || (!songTitle.trim() && !query.trim())}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Searching...' : 'Search Songs'}
              </button>
            </div>
          ) : (
            // Standard search for other types
            <div className="flex space-x-4">
              <input
                type="text"
                placeholder={`Search for ${searchType}...`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                onClick={handleSearch}
                disabled={loading || !query.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          )}
        </div>

        {hasSearched && (
          <div className="bg-white rounded-lg shadow-md p-6">
            {/* Enhanced Search Metadata for Songs */}
            {searchType === 'songs' && searchMetadata && !loading && !error && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-gray-600">
                      <strong>{searchMetadata.totalCount}</strong> results found
                    </span>
                    {searchMetadata.cached && (
                      <span className="text-green-600 font-medium">🚀 Fast Cache Hit</span>
                    )}
                    {searchMetadata.searchTime && (
                      <span className="text-gray-500">
                        {searchMetadata.searchTime}ms
                      </span>
                    )}
                  </div>
                  <div className="text-gray-500">
                    {searchMetadata.primary_source === 'musicbrainz_enhanced' && 'Smart Prioritization'}
                  </div>
                </div>
                {searchMetadata.sources && (
                  <div className="mt-2 text-xs text-gray-500">
                    Sources: MusicBrainz ({searchMetadata.sources.musicbrainz || 0})
                    {searchMetadata.sources.discogs > 0 && `, Discogs (${searchMetadata.sources.discogs})`}
                  </div>
                )}
              </div>
            )}
            
            <SearchResults
              results={results}
              loading={loading}
              error={error}
              searchType={searchType}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
