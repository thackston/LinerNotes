const axios = require('axios');

const popularSongs = [
  'Hotel California Eagles',
  'Stairway to Heaven Led Zeppelin', 
  'Bohemian Rhapsody Queen',
  'Imagine John Lennon',
  'Sweet Child O Mine Guns N Roses',
  'Billie Jean Michael Jackson',
  'Like a Rolling Stone Bob Dylan',
  'Smells Like Teen Spirit Nirvana'
];

async function testPopularSongs() {
  console.log('🎵 Testing Popular Songs That Should Work...\n');
  
  for (const song of popularSongs) {
    console.log(`🔍 Testing: "${song}"`);
    
    try {
      const response = await axios.get('http://localhost:3001/api/search/songs', {
        params: {
          q: song,
          limit: 3
        },
        timeout: 30000
      });
      
      const results = response.data.results?.length || 0;
      const cached = response.data.cached ? '🚀 Cache' : '🌐 Live';
      const time = response.data.searchTime ? `${response.data.searchTime}ms` : '';
      
      if (results > 0) {
        console.log(`✅ ${song}: ${results} results ${cached} ${time}`);
        console.log(`   Top result: "${response.data.results[0].title}" - ${response.data.results[0].artist}`);
      } else {
        console.log(`❌ ${song}: No results ${cached} ${time}`);
      }
      
    } catch (error) {
      console.log(`❌ ${song}: Error - ${error.message}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n🎯 Analysis:');
  console.log('• If most songs return 0 results, there\'s a backend issue');
  console.log('• If some work but others don\'t, it\'s query-specific');
  console.log('• Check backend console for detailed error logs');
}

testPopularSongs().catch(console.error);