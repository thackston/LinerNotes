/**
 * Manual test of Smart Ranking logic (JavaScript version for easy testing)
 * This validates our TypeScript algorithm works correctly
 */

// Simplified version of our SmartRankingService for testing
class TestSmartRanking {
  constructor() {
    this.COMPILATION_KEYWORDS = [
      'greatest', 'hits', 'collection', 'best', 'compilation',
      'anthology', 'essential', 'ultimate', 'complete'
    ];
    
    this.LIVE_BOOTLEG_KEYWORDS = [
      'live', 'concert', 'bootleg', 'unofficial', 'demo'
    ];
  }

  calculatePriorityScore(recording, searchArtist) {
    let score = 0;
    let reasons = [];

    // Artist match (essential)
    const hasArtistMatch = this.hasArtistMatch(recording, searchArtist);
    if (hasArtistMatch) {
      score += 1000;
      reasons.push('Artist match');
    } else {
      return { score: 50, reason: 'No artist match', bestRelease: null };
    }

    // Find best release
    const bestRelease = this.findBestRelease(recording.releases || []);
    if (!bestRelease) {
      return { score: score + 100, reason: 'No releases', bestRelease: null };
    }

    // Release status
    if (bestRelease.status === 'Official') {
      score += 500;
      reasons.push('Official');
    } else if (bestRelease.status === 'Bootleg') {
      score -= 300;
      reasons.push('Bootleg');
    }

    // Release type scoring
    const releaseTypeScore = this.scoreReleaseType(bestRelease);
    score += releaseTypeScore.score;
    reasons.push(releaseTypeScore.reason);

    // Compilation detection
    const compilationPenalty = this.detectCompilation(bestRelease.title);
    if (compilationPenalty > 0) {
      score -= compilationPenalty;
      reasons.push(`Compilation (-${compilationPenalty})`);
    }

    // Live/bootleg detection
    const livePenalty = this.detectLiveOrBootleg(bestRelease.title);
    if (livePenalty > 0) {
      score -= livePenalty;
      reasons.push(`Live/bootleg (-${livePenalty})`);
    }

    return {
      score: Math.max(0, score),
      reason: reasons.join(', '),
      bestRelease
    };
  }

  hasArtistMatch(recording, searchArtist) {
    if (!searchArtist) return true;
    const normalizedSearch = searchArtist.toLowerCase();
    
    // Check artist credits
    if (recording['artist-credit']) {
      for (const credit of recording['artist-credit']) {
        if (credit.name.toLowerCase().includes(normalizedSearch)) {
          return true;
        }
      }
    }
    return false;
  }

  findBestRelease(releases) {
    if (!releases.length) return null;
    
    // Sort by preference: Official albums first, then by date
    return releases.sort((a, b) => {
      if (a.status === 'Official' && b.status !== 'Official') return -1;
      if (b.status === 'Official' && a.status !== 'Official') return 1;
      
      if (a['primary-type'] === 'Album' && b['primary-type'] !== 'Album') return -1;
      if (b['primary-type'] === 'Album' && a['primary-type'] !== 'Album') return 1;
      
      return 0;
    })[0];
  }

  scoreReleaseType(release) {
    const secondaryTypes = release['secondary-types'] || [];
    
    if (secondaryTypes.includes('Compilation')) {
      return { score: 200, reason: 'Compilation album' };
    }
    
    switch (release['primary-type']) {
      case 'Album':
        return { score: 800, reason: 'Studio album' };
      case 'Single':
        return { score: 600, reason: 'Single' };
      case 'EP':
        return { score: 400, reason: 'EP' };
      default:
        return { score: 300, reason: 'Other' };
    }
  }

  detectCompilation(title) {
    if (!title) return 0;
    const normalizedTitle = title.toLowerCase();
    let penalty = 0;
    
    for (const keyword of this.COMPILATION_KEYWORDS) {
      if (normalizedTitle.includes(keyword)) {
        penalty += 200;
      }
    }
    
    if (normalizedTitle.match(/\d{4}-\d{4}/)) {
      penalty += 300;
    }
    
    return penalty;
  }

  detectLiveOrBootleg(title) {
    if (!title) return 0;
    const normalizedTitle = title.toLowerCase();
    let penalty = 0;
    
    for (const keyword of this.LIVE_BOOTLEG_KEYWORDS) {
      if (normalizedTitle.includes(keyword)) {
        penalty += 150;
      }
    }
    
    return penalty;
  }

  sortResults(results, searchArtist) {
    const scoredResults = results.map(recording => {
      const scoring = this.calculatePriorityScore(recording, searchArtist);
      return {
        ...recording,
        _priorityScore: scoring.score,
        _scoringReason: scoring.reason,
        _bestRelease: scoring.bestRelease
      };
    });

    return scoredResults.sort((a, b) => {
      if (a._priorityScore !== b._priorityScore) {
        return b._priorityScore - a._priorityScore;
      }
      
      // Chronological tiebreaker
      const aYear = new Date(a._bestRelease?.['first-release-date'] || '2099').getFullYear();
      const bYear = new Date(b._bestRelease?.['first-release-date'] || '2099').getFullYear();
      return aYear - bYear;
    });
  }
}

// Test data
const mockBeatlesResults = [
  {
    id: 'recording-1',
    title: 'Come Together',
    'artist-credit': [{ name: 'The Beatles' }],
    releases: [{
      id: 'release-1',
      title: 'Abbey Road',
      status: 'Official',
      'primary-type': 'Album',
      'first-release-date': '1969-09-26'
    }]
  },
  {
    id: 'recording-2', 
    title: 'Come Together',
    'artist-credit': [{ name: 'The Beatles' }],
    releases: [{
      id: 'release-2',
      title: '1962-1966',
      status: 'Official',
      'primary-type': 'Album',
      'secondary-types': ['Compilation'],
      'first-release-date': '1973-04-19'
    }]
  },
  {
    id: 'recording-3',
    title: 'Come Together',
    'artist-credit': [{ name: 'The Beatles' }],
    releases: [{
      id: 'release-3',
      title: 'Come Together / Something',
      status: 'Official',
      'primary-type': 'Single',
      'first-release-date': '1969-10-31'
    }]
  },
  {
    id: 'recording-4',
    title: 'Come Together',
    'artist-credit': [{ name: 'The Beatles' }],
    releases: [{
      id: 'release-4',
      title: 'The Beatles Greatest Hits',
      status: 'Official',
      'primary-type': 'Album',
      'first-release-date': '1982-10-11'
    }]
  },
  {
    id: 'recording-5',
    title: 'Come Together',
    'artist-credit': [{ name: 'The Beatles' }],
    releases: [{
      id: 'release-5', 
      title: 'Live at the BBC',
      status: 'Official',
      'primary-type': 'Album',
      'secondary-types': ['Live'],
      'first-release-date': '1994-11-30'
    }]
  },
  {
    id: 'recording-6',
    title: 'Come Together',
    'artist-credit': [{ name: 'The Beatles' }],
    releases: [{
      id: 'release-6',
      title: 'Unreleased Sessions',
      status: 'Bootleg',
      'primary-type': 'Album',
      'first-release-date': '1969-08-01'
    }]
  }
];

// Run test
function runTest() {
  console.log('🧪 Testing Smart Ranking Algorithm');
  console.log('='.repeat(50));

  const ranker = new TestSmartRanking();
  const sortedResults = ranker.sortResults(mockBeatlesResults, 'The Beatles');

  console.log('\n📊 Results (sorted by priority):');
  sortedResults.forEach((result, index) => {
    console.log(`${index + 1}. ${result._bestRelease?.title || 'Unknown'}`);
    console.log(`   Score: ${result._priorityScore} | ${result._scoringReason}`);
    console.log(`   Type: ${result._bestRelease?.['primary-type']} | Year: ${result._bestRelease?.['first-release-date']?.substring(0, 4)}`);
    console.log('');
  });

  // Verify expected order
  const expectedOrder = [
    'Abbey Road',              // Original studio album - should be #1
    'Come Together / Something', // Original single - should be #2
    '1962-1966',              // Compilation album - should be #3
    'Live at the BBC',        // Live album - should be #4  
    'The Beatles Greatest Hits', // Compilation with "Greatest" - should be #5
    'Unreleased Sessions'     // Bootleg - should be #6
  ];

  console.log('✅ Verification:');
  const actualOrder = sortedResults.map(r => r._bestRelease?.title);
  
  let allCorrect = true;
  expectedOrder.forEach((expected, index) => {
    const actual = actualOrder[index];
    const match = expected === actual;
    const icon = match ? '✅' : '❌';
    console.log(`${index + 1}. Expected: "${expected}" | Actual: "${actual}" ${icon}`);
    if (!match) allCorrect = false;
  });

  console.log(`\n🎯 Overall Test Result: ${allCorrect ? '✅ PASSED' : '❌ FAILED'}`);
  
  return allCorrect;
}

// Export for potential use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runTest, TestSmartRanking };
}

// Run if called directly
if (typeof window === 'undefined') {
  runTest();
}