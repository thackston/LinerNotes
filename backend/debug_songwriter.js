const axios = require('axios');

async function debugSongwriter() {
  console.log('🔍 Debugging Songwriter Data for "Late for the Sky" by Jackson Browne\n');
  
  try {
    // Test 1: Direct MusicBrainz API call
    console.log('📡 Step 1: Direct MusicBrainz API call...');
    
    const response = await axios.get('https://musicbrainz.org/ws/2/recording', {
      params: {
        query: 'recording:"Late for the Sky" AND artist:"Jackson Browne"',
        fmt: 'json',
        limit: 3,
        inc: 'releases+release-groups+artist-credits+artist-rels+work-rels+recording-rels'
      },
      headers: {
        'User-Agent': 'LinerNotesApp/1.0.0'
      },
      timeout: 15000
    });
    
    console.log(`✅ Found ${response.data.recordings?.length || 0} recordings\n`);
    
    if (response.data.recordings && response.data.recordings.length > 0) {
      const recording = response.data.recordings[0];
      
      console.log(`🎵 Recording: "${recording.title}"`);
      console.log(`   ID: ${recording.id}`);
      console.log(`   Artist Credits: ${recording['artist-credit']?.map(ac => ac.name).join(', ')}`);
      
      // Check for relations
      console.log('\n🔗 Relations Data:');
      if (recording.relations && recording.relations.length > 0) {
        console.log(`   Found ${recording.relations.length} relations:`);
        recording.relations.forEach((rel, idx) => {
          console.log(`   ${idx + 1}. Type: "${rel.type}"`);
          console.log(`      Artist: ${rel.artist?.name || 'N/A'}`);
          console.log(`      Attributes: ${rel.attributes?.join(', ') || 'None'}`);
          console.log('');
        });
        
        // Look for songwriter relations
        const songwriterRels = recording.relations.filter(rel => {
          const type = rel.type?.toLowerCase() || '';
          return type.includes('composer') || type.includes('lyricist') || type.includes('writer');
        });
        
        if (songwriterRels.length > 0) {
          console.log('✅ SONGWRITER RELATIONS FOUND:');
          songwriterRels.forEach(rel => {
            console.log(`   • ${rel.artist?.name} - ${rel.type}`);
          });
        } else {
          console.log('❌ NO SONGWRITER RELATIONS FOUND');
          
          // Check if artist-credit could be used as songwriter
          console.log('\n💡 Checking artist-credit as potential songwriter:');
          if (recording['artist-credit']) {
            recording['artist-credit'].forEach(ac => {
              console.log(`   • ${ac.name} (performer - could be songwriter)`);
            });
          }
        }
        
      } else {
        console.log('   ❌ No relations found at all');
      }
      
      // Test 2: Check what our backend extraction logic would do
      console.log('\n🔧 Step 2: Testing Backend Extraction Logic...');
      
      const extractedCredits = extractCreditsLikeBackend(recording);
      console.log('Extracted Credits:');
      console.log(`   Songwriters: ${extractedCredits.songwriters.length}`);
      if (extractedCredits.songwriters.length > 0) {
        extractedCredits.songwriters.forEach(sw => {
          console.log(`     • ${sw.name} (${sw.role})`);
        });
      }
      
    } else {
      console.log('❌ No recordings found');
    }
    
    // Test 3: Check if this matches what our API returns
    console.log('\n🌐 Step 3: Testing Our Backend API...');
    try {
      const backendResponse = await axios.get('http://localhost:3001/api/search/songs', {
        params: {
          song: 'Late for the Sky',
          artist: 'Jackson Browne',
          limit: 3
        },
        timeout: 10000
      });
      
      console.log('✅ Backend API Response:');
      const results = backendResponse.data.results || [];
      console.log(`   Found ${results.length} results`);
      
      if (results.length > 0) {
        const firstResult = results[0];
        console.log(`   First result: "${firstResult.title}" by ${firstResult.artist}`);
        console.log(`   Credits object:`, JSON.stringify(firstResult.credits, null, 2));
        
        if (firstResult.credits?.songwriters?.length > 0) {
          console.log('✅ SONGWRITERS IN BACKEND RESPONSE:');
          firstResult.credits.songwriters.forEach(sw => {
            console.log(`     • ${sw.name} (${sw.role})`);
          });
        } else {
          console.log('❌ NO SONGWRITERS IN BACKEND RESPONSE');
        }
      }
      
    } catch (backendError) {
      console.log('❌ Backend API Error:', backendError.message);
      console.log('   Make sure your backend is running on port 3001');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n🎯 ANALYSIS:');
  console.log('1. If MusicBrainz has no songwriter relations, that\'s the root cause');
  console.log('2. If MusicBrainz has relations but backend doesn\'t extract them, it\'s a backend issue');
  console.log('3. If backend extracts them but UI doesn\'t show them, it\'s a frontend issue');
}

// Simulate our backend's credit extraction logic
function extractCreditsLikeBackend(recording) {
  const credits = {
    songwriters: [],
    producers: [],
    musicians: [],
    engineers: [],
    miscellaneous: []
  };

  // Add artist-credit as assumed songwriters (like our backend does)
  if (recording['artist-credit']) {
    recording['artist-credit'].forEach((artistCredit) => {
      if (artistCredit.artist) {
        credits.songwriters.push({
          name: artistCredit.artist.name,
          role: 'Artist (assumed songwriter)',
          attributes: 'performer'
        });
      }
    });
  }

  // Look for actual songwriter relations
  let foundActualSongwriters = false;
  if (recording.relations && recording.relations.length > 0) {
    recording.relations.forEach((relation) => {
      if (relation.type && relation.artist) {
        const roleType = relation.type.toLowerCase();
        const credit = {
          name: relation.artist.name,
          role: relation.type,
          attributes: relation.attributes?.join(', ') || undefined
        };

        if (roleType.includes('composer') || roleType.includes('lyricist') || roleType.includes('writer')) {
          if (!foundActualSongwriters) {
            credits.songwriters = []; // Clear assumed songwriters
            foundActualSongwriters = true;
          }
          credits.songwriters.push(credit);
        }
      }
    });
  }

  // If no explicit songwriters found, keep the assumed ones
  if (!foundActualSongwriters && credits.songwriters.length > 0) {
    credits.songwriters = credits.songwriters.map(sw => ({
      ...sw,
      role: 'Performer (likely songwriter)'
    }));
  }

  return credits;
}

debugSongwriter().catch(console.error);