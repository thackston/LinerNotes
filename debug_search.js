const axios = require('axios');

async function testDirectMusicBrainzAPI() {
  console.log('🔍 Testing MusicBrainz API directly...\n');
  
  const testQueries = [
    'recording:"Late For the Sky" AND artist:"Jackson Browne"',
    'recording:Late For the Sky AND artist:Jackson Browne',
    'Late For the Sky AND artist:Jackson Browne',
    'recording:"Late For the Sky"',
    'Late For the Sky'
  ];
  
  for (let i = 0; i < testQueries.length; i++) {
    const query = testQueries[i];
    console.log(`🌐 Testing query ${i + 1}: ${query}`);
    
    try {
      const response = await axios.get('https://musicbrainz.org/ws/2/recording', {
        params: {
          query,
          fmt: 'json',
          limit: 5,
          inc: 'releases+release-groups+artist-credits'
        },
        headers: {
          'User-Agent': 'LinerNotesApp/1.0.0'
        },
        timeout: 15000
      });
      
      const recordings = response.data.recordings || [];
      console.log(`📦 Query ${i + 1} returned ${recordings.length} results`);
      
      if (recordings.length > 0) {
        console.log(`✅ First result: "${recordings[0].title}" by ${recordings[0]['artist-credit']?.[0]?.name || 'Unknown'}`);
        break; // Found results, stop testing
      } else {
        console.log(`❌ No results for query ${i + 1}`);
      }
      
      // Rate limit compliance
      await new Promise(resolve => setTimeout(resolve, 1100));
      
    } catch (error) {
      console.error(`❌ Query ${i + 1} failed:`, error.message);
    }
  }
}

async function testBackendAPI() {
  console.log('\n🔍 Testing backend API...\n');
  
  try {
    const response = await axios.get('http://localhost:3001/api/search/songs', {
      params: {
        q: 'Late For the Sky Jackson Browne',
        limit: 5
      },
      timeout: 30000
    });
    
    console.log('📦 Backend response:', {
      resultCount: response.data.results?.length || 0,
      cached: response.data.cached,
      searchTime: response.data.searchTime,
      sources: response.data.sources,
      totalCount: response.data.totalCount
    });
    
    if (response.data.results?.length > 0) {
      console.log('✅ Sample result:', {
        title: response.data.results[0].title,
        artist: response.data.results[0].artist,
        album: response.data.results[0].album
      });
    }
    
  } catch (error) {
    console.error('❌ Backend API test failed:', error.message);
  }
}

async function runTests() {
  console.log('🧪 Debugging Search Issues\n');
  
  // Test MusicBrainz directly
  await testDirectMusicBrainzAPI();
  
  // Test our backend
  await testBackendAPI();
  
  console.log('\n🎯 Recommendations:');
  console.log('1. Check backend console for detailed logs');
  console.log('2. Try simpler song names like "Hotel California"');
  console.log('3. Check if MusicBrainz is experiencing issues');
}

runTests().catch(console.error);