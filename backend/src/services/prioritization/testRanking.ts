import { smartRankingService, MusicBrainzRecording } from './smartRanking';

/**
 * Test the Smart Ranking Service with realistic Beatles data
 * This simulates what MusicBrainz would return for "Come Together Beatles"
 */

// Mock MusicBrainz data for "Come Together" by The Beatles
const mockBeatlesResults: MusicBrainzRecording[] = [
  // 1. Abbey Road - Original studio album (should be #1)
  {
    id: 'recording-1',
    title: 'Come Together',
    length: 259000,
    'artist-credit': [{ name: 'The Beatles', artist: { id: 'artist-1', name: 'The Beatles' } }],
    releases: [{
      id: 'release-1',
      title: 'Abbey Road',
      status: 'Official',
      'primary-type': 'Album',
      'first-release-date': '1969-09-26',
      'artist-credit': [{ name: 'The Beatles' }]
    }]
  },

  // 2. 1962-1966 (Red Album) - Compilation (should be lower priority)
  {
    id: 'recording-2', 
    title: 'Come Together',
    length: 259000,
    'artist-credit': [{ name: 'The Beatles', artist: { id: 'artist-1', name: 'The Beatles' } }],
    releases: [{
      id: 'release-2',
      title: '1962-1966',
      status: 'Official',
      'primary-type': 'Album',
      'secondary-types': ['Compilation'],
      'first-release-date': '1973-04-19',
      'artist-credit': [{ name: 'The Beatles' }]
    }]
  },

  // 3. Come Together / Something - Original single (should be #2)
  {
    id: 'recording-3',
    title: 'Come Together',
    length: 259000,
    'artist-credit': [{ name: 'The Beatles', artist: { id: 'artist-1', name: 'The Beatles' } }],
    releases: [{
      id: 'release-3',
      title: 'Come Together / Something',
      status: 'Official',
      'primary-type': 'Single',
      'first-release-date': '1969-10-31',
      'artist-credit': [{ name: 'The Beatles' }]
    }]
  },

  // 4. Greatest Hits compilation (should be low priority)
  {
    id: 'recording-4',
    title: 'Come Together',
    length: 259000,
    'artist-credit': [{ name: 'The Beatles', artist: { id: 'artist-1', name: 'The Beatles' } }],
    releases: [{
      id: 'release-4',
      title: 'The Beatles Greatest Hits',
      status: 'Official',
      'primary-type': 'Album',
      'first-release-date': '1982-10-11',
      'artist-credit': [{ name: 'The Beatles' }]
    }]
  },

  // 5. Live recording (should be lower priority)
  {
    id: 'recording-5',
    title: 'Come Together',
    length: 280000,
    'artist-credit': [{ name: 'The Beatles', artist: { id: 'artist-1', name: 'The Beatles' } }],
    releases: [{
      id: 'release-5', 
      title: 'Live at the BBC',
      status: 'Official',
      'primary-type': 'Album',
      'secondary-types': ['Live'],
      'first-release-date': '1994-11-30',
      'artist-credit': [{ name: 'The Beatles' }]
    }]
  },

  // 6. Bootleg (should be lowest priority)
  {
    id: 'recording-6',
    title: 'Come Together',
    length: 245000,
    'artist-credit': [{ name: 'The Beatles', artist: { id: 'artist-1', name: 'The Beatles' } }],
    releases: [{
      id: 'release-6',
      title: 'Unreleased Sessions',
      status: 'Bootleg',
      'primary-type': 'Album',
      'first-release-date': '1969-08-01',
      'artist-credit': [{ name: 'The Beatles' }]
    }]
  }
];

async function testSmartRanking() {
  console.log('🧪 Testing Smart Ranking Algorithm');
  console.log('='.repeat(50));

  // Test 1: Sort Beatles results
  console.log('\n📊 Test 1: Beatles "Come Together" Ranking');
  const sortedResults = smartRankingService.sortResults(mockBeatlesResults, 'The Beatles');

  sortedResults.forEach((result, index) => {
    const explanation = smartRankingService.explainScoring(result, 'The Beatles');
    console.log(`${index + 1}. ${result._bestRelease?.title || 'Unknown'}`);
    console.log(`   ${explanation}`);
    console.log(`   Release Type: ${result._bestRelease?.['primary-type'] || 'Unknown'}`);
    console.log('');
  });

  // Test 2: Verify expected order
  console.log('\n✅ Expected vs Actual Order:');
  const expectedOrder = [
    'Abbey Road',           // Original studio album
    'Come Together / Something', // Original single  
    '1962-1966',           // Compilation album
    'Live at the BBC',     // Live album
    'The Beatles Greatest Hits', // Compilation with "Greatest" keyword
    'Unreleased Sessions'  // Bootleg
  ];

  const actualOrder = sortedResults.map(r => r._bestRelease?.title);
  
  expectedOrder.forEach((expected, index) => {
    const actual = actualOrder[index];
    const match = expected === actual ? '✅' : '❌';
    console.log(`${index + 1}. Expected: "${expected}" | Actual: "${actual}" ${match}`);
  });

  // Test 3: Score breakdown
  console.log('\n📈 Score Breakdown:');
  sortedResults.forEach((result, index) => {
    console.log(`${index + 1}. ${result._bestRelease?.title}: ${result._priorityScore} points`);
    console.log(`   Reason: ${result._scoringReason}`);
  });

  // Test 4: Test with non-Beatles artist
  console.log('\n🎸 Test 4: Non-Beatles Artist (should have lower scores)');
  const queenResults = smartRankingService.sortResults(mockBeatlesResults, 'Queen');
  queenResults.forEach((result, index) => {
    if (index < 2) { // Just show first 2
      console.log(`${index + 1}. Score: ${result._priorityScore} (${result._scoringReason})`);
    }
  });

  console.log('\n🎯 Smart Ranking Test Complete!');
}

// Run the test
if (require.main === module) {
  testSmartRanking().catch(console.error);
}

export { testSmartRanking };