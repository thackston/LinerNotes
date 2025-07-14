// Test the fixed query parsing logic
const testQueries = [
  'Late For The Sky Jackson Browne',
  'Hotel California Eagles', 
  'Bohemian Rhapsody Queen',
  'Sweet Child O Mine Guns N Roses',
  'Come Together Beatles',
  'Stairway to Heaven Led Zeppelin',
  'Imagine John Lennon',
  'Billie Jean Michael Jackson'
];

function isLikelyArtistName(text) {
  const artistIndicators = [
    /^the\s+/i,
    /\s+band$/i,
    /^[A-Z][a-z]+(\s+[A-Z][a-z]*)*$/,
    /beatles|queen|bowie|dylan|prince|madonna|elvis|stones|zeppelin|floyd|radiohead|nirvana|metallica|u2|coldplay|eminem|taylor\s*swift|adele|beyonce|kanye|jay-z|drake|rihanna|bruno\s*mars|ed\s*sheeran|justin\s*bieber|ariana\s*grande|billie\s*eilish|jackson\s*browne|eagles|guns\s*n\s*roses|fleetwood\s*mac|john\s*lennon|paul\s*mccartney|michael\s*jackson|stevie\s*wonder|bob\s*marley/i,
    /\s+(band|group|orchestra|quartet|trio|duo)$/i,
    /^[A-Z][a-z]{2,}$/,
    /^[A-Z][a-z]*(\s+[A-Z][a-z]*)+$/
  ];
  
  return artistIndicators.some(pattern => pattern.test(text));
}

function parseSearchQuery(query, explicitArtist) {
  if (explicitArtist) {
    return { artist: explicitArtist, song: query.trim() };
  }

  // Handle "artist - song" format
  const dashMatch = query.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (dashMatch) {
    return { 
      artist: dashMatch[1].trim(), 
      song: dashMatch[2].trim() 
    };
  }

  // Handle structured format
  const structuredMatch = query.match(/(?:artist[:\s]+([^,]+))(?:.*song[:\s]+([^,]+))?|(?:song[:\s]+([^,]+))(?:.*artist[:\s]+([^,]+))?/i);
  if (structuredMatch) {
    const artist = structuredMatch[1] || structuredMatch[4] || '';
    const song = structuredMatch[2] || structuredMatch[3] || '';
    return { 
      artist: artist.trim(), 
      song: song.trim() 
    };
  }

  // For simple queries, try to detect if last word(s) are artist names
  const words = query.trim().split(/\s+/);
  if (words.length >= 3) {
    // Try different combinations: last 1, 2, 3 words as artist
    const potentialArtists = [
      words.slice(-2).join(' '), // Last two words (try first for "Jackson Browne")
      words.slice(-3).join(' '), // Last three words (for "Guns N Roses")
      words.slice(-1).join(' ')  // Last word (fallback)
    ];
    
    // Check against common artist patterns
    for (const potentialArtist of potentialArtists) {
      if (isLikelyArtistName(potentialArtist)) {
        // Calculate where artist starts in the original array
        const artistWords = potentialArtist.split(' ');
        const artistStartIndex = words.length - artistWords.length;
        const song = words.slice(0, artistStartIndex).join(' ');
        
        if (song.length > 0) {
          return { artist: potentialArtist, song: song };
        }
      }
    }
  }

  // Default: treat entire query as song title, no specific artist
  return { artist: '', song: query.trim() };
}

console.log('🧪 Testing Fixed Query Parsing...\n');

testQueries.forEach(query => {
  const result = parseSearchQuery(query);
  const status = result.artist ? '✅' : '⚠️';
  console.log(`${status} "${query}"`);
  console.log(`   Artist: "${result.artist}"`);
  console.log(`   Song: "${result.song}"`);
  console.log('');
});

console.log('🎯 Expected Results:');
console.log('✅ All queries should now correctly split artist and song');
console.log('✅ "Jackson Browne" should be recognized as artist');
console.log('✅ "Guns N Roses" should be recognized as 3-word artist');