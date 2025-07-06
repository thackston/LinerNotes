import React, { useState, useCallback } from 'react';
import { apiService } from './services/api';
import { SearchResults } from './components/SearchResults';

type SearchType = 'songs' | 'artists' | 'albums' | 'people';

function App() {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('songs');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      let response;
      switch (searchType) {
        case 'songs':
          response = await apiService.searchSongs(query);
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

      // Combine primary and supplementary results
      const combinedResults = [...response.results.primary, ...response.results.supplementary];
      setResults(combinedResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, searchType]);

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
        </div>

        {hasSearched && (
          <div className="bg-white rounded-lg shadow-md p-6">
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
