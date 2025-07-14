const axios = require('axios');

async function testMusicBrainzDirect() {
  console.log('🌐 Testing MusicBrainz API Directly for Songwriter Data\n');
  
  try {
    console.log('📡 Calling MusicBrainz with relationship includes...');
    
    const response = await axios.get('https://musicbrainz.org/ws/2/recording', {
      params: {
        query: 'recording:"Yesterday" AND artist:"The Beatles"',
        fmt: 'json',
        limit: 3,
        inc: 'releases+release-groups+artist-credits+artist-rels+work-rels+recording-rels'
      },
      headers: {
        'User-Agent': 'LinerNotesApp/1.0.0'
      },
      timeout: 15000
    });
    
    console.log(`✅ MusicBrainz returned ${response.data.recordings?.length || 0} recordings\n`);
    
    if (response.data.recordings && response.data.recordings.length > 0) {
      const recording = response.data.recordings[0];
      
      console.log(`🎵 Recording: "${recording.title}"`);
      console.log(`   ID: ${recording.id}`);
      console.log(`   Artist Credits: ${recording['artist-credit']?.map(ac => ac.name).join(', ')}`);
      
      console.log('\n🔗 Relationships:');
      if (recording.relations && recording.relations.length > 0) {
        recording.relations.forEach((rel, idx) => {
          console.log(`   ${idx + 1}. Type: ${rel.type}`);
          console.log(`      Artist: ${rel.artist?.name || 'N/A'}`);
          console.log(`      Attributes: ${rel.attributes?.join(', ') || 'None'}`);
          console.log('');
        });
      } else {
        console.log('   ❌ No relationships found');
      }
      
      // Look for songwriter-related relationships
      const songwriterRels = recording.relations?.filter(rel => {
        const type = rel.type?.toLowerCase() || '';
        return type.includes('composer') || type.includes('lyricist') || type.includes('writer');
      }) || [];
      
      if (songwriterRels.length > 0) {
        console.log('✅ SONGWRITER RELATIONSHIPS FOUND:');
        songwriterRels.forEach((rel, idx) => {
          console.log(`   ${idx + 1}. ${rel.artist?.name} - ${rel.type}`);
        });
      } else {
        console.log('❌ NO SONGWRITER RELATIONSHIPS FOUND');
        console.log('   This might be why songwriters aren\'t showing in the UI');
      }
      
    } else {
      console.log('❌ No recordings found for "Yesterday" by "The Beatles"');
    }
    
  } catch (error) {
    console.error('❌ MusicBrainz API Error:', error.message);
  }
  
  console.log('\n🎯 ANALYSIS:');
  console.log('If this test shows songwriter relationships, but they\'re not in your UI:');
  console.log('1. Backend transformation issue - check extractBasicCredits function');
  console.log('2. Frontend display issue - check React component');
  console.log('');
  console.log('If this test shows NO songwriter relationships:');
  console.log('1. MusicBrainz might not have songwriter data for this song');
  console.log('2. Try a different song like "Imagine" by "John Lennon"');
  console.log('3. The includes might not be working as expected');
}

testMusicBrainzDirect().catch(console.error);