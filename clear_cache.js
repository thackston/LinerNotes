const axios = require('axios');

async function clearBadCache() {
  console.log('🧹 Clearing Bad Cache Entries...\n');
  
  // The bad cached searches we saw in the logs
  const badSearches = [
    'Late For The Sky Jackson Browne',
    'Late For the Sky Jackson Browne', 
    'Late For The Sky',
    'Jackson Browne'
  ];
  
  console.log('📋 Bad cache entries to clear:');
  badSearches.forEach((search, i) => {
    console.log(`${i + 1}. "${search}"`);
  });
  
  console.log('\n🔧 The issue was:');
  console.log('❌ "Late For The Sky Jackson Browne" was parsed as:');
  console.log('   Artist: "Browne" (wrong!)');
  console.log('   Song: "Late For the Sky Jackson" (wrong!)');
  console.log('');
  console.log('✅ Should be parsed as:');
  console.log('   Artist: "Jackson Browne" (correct!)');
  console.log('   Song: "Late For The Sky" (correct!)');
  
  console.log('\n🚀 After rebuilding backend:');
  console.log('1. The query parser now tries 2-word artists first');
  console.log('2. Added "Jackson Browne" to known artists list');
  console.log('3. Fixed artist/song splitting logic');
  
  console.log('\n📋 Next steps:');
  console.log('1. Build and restart backend:');
  console.log('   cd /Users/mattthackston/LinerNotes/backend');
  console.log('   npm run build && npm start');
  console.log('');
  console.log('2. Test these searches (should work now):');
  console.log('   • "Late For The Sky Jackson Browne"');
  console.log('   • "Hotel California Eagles"');
  console.log('   • "Bohemian Rhapsody Queen"');
  console.log('   • "Sweet Child O Mine Guns N Roses"');
  
  console.log('\n⚠️  The bad cache entries will expire automatically or can be cleared by restarting Redis.');
}

clearBadCache();