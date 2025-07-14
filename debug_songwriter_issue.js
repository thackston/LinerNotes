const axios = require('axios');

async function debugSongwriterIssue() {
  console.log('🔍 Debugging Songwriter Display Issue\n');
  
  // Test a specific song that should have songwriter info
  const testSong = 'Yesterday';
  const testArtist = 'The Beatles';
  
  console.log(`🎵 Testing: "${testSong}" by "${testArtist}"\n`);
  
  try {
    // Test the backend API directly
    console.log('📡 Testing backend API...');
    const response = await axios.get('http://localhost:3001/api/search/songs', {
      params: {
        song: testSong,
        artist: testArtist,
        limit: 3
      },
      timeout: 30000
    });
    
    console.log('✅ Backend Response:');
    console.log(`   Results: ${response.data.results?.length || 0}`);
    console.log(`   Cached: ${response.data.cached}`);
    console.log(`   Sources: ${JSON.stringify(response.data.sources)}`);
    
    if (response.data.results && response.data.results.length > 0) {
      const firstResult = response.data.results[0];
      console.log(`\n🎼 First Result Credits:`, JSON.stringify(firstResult.credits, null, 2));
      
      if (firstResult.credits?.songwriters?.length > 0) {
        console.log('\n✅ SONGWRITERS FOUND IN BACKEND:');
        firstResult.credits.songwriters.forEach((sw, idx) => {
          console.log(`   ${idx + 1}. ${sw.name} (${sw.role})`);
        });
      } else {
        console.log('\n❌ NO SONGWRITERS IN BACKEND RESPONSE');
        console.log('   Credits structure:', Object.keys(firstResult.credits || {}));
      }
    } else {
      console.log('\n❌ NO RESULTS RETURNED');
    }
    
  } catch (error) {
    console.error('❌ Backend API Error:', error.message);
  }
  
  console.log('\n📋 NEXT STEPS:');
  console.log('1. Check your backend console for these messages:');
  console.log('   "🎼 Found X songwriter(s) for [song title]"');
  console.log('   "❌ No songwriters found for [song title]"');
  console.log('');
  console.log('2. If you see songwriter messages in backend but not in API response:');
  console.log('   - There might be a data transformation issue');
  console.log('');
  console.log('3. If you see NO songwriter messages in backend:');
  console.log('   - MusicBrainz might not be returning relationship data');
  console.log('   - Backend might need to be rebuilt with the new includes');
  console.log('');
  console.log('4. Open browser console (F12) and search for the same song');
  console.log('   - Look for songwriter data in frontend logs');
}

debugSongwriterIssue().catch(console.error);