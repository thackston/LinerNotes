const { redisService } = require('./dist/services/cache/redisService');

async function clearCache() {
  console.log('🧹 Clearing Redis Cache for Fresh Songwriter Data...\n');
  
  try {
    console.log('1. Clearing search cache (songs, artists, albums)...');
    const searchCleared = await redisService.clearSearchCache();
    
    console.log('2. Clearing credits cache (songwriter information)...');
    const creditsCleared = await redisService.clearCreditsCache();
    
    if (searchCleared && creditsCleared) {
      console.log('\n✅ Cache cleared successfully!');
      console.log('\n🎯 What this means:');
      console.log('   • Next searches will fetch fresh data from MusicBrainz');
      console.log('   • New searches will include enhanced songwriter relationship data');
      console.log('   • Previous cached results (without songwriters) are now cleared');
      
      console.log('\n🚀 Next steps:');
      console.log('   1. Start your backend: npm start');
      console.log('   2. Search for "Yesterday" by "The Beatles"');
      console.log('   3. Look for songwriter information in the UI');
      console.log('   4. Check backend console for "🎼 Found X songwriter(s)" logs');
    } else {
      console.log('\n⚠️ Some cache clearing operations failed');
      console.log('Cache might not be connected or might have errors');
    }
    
  } catch (error) {
    console.error('\n❌ Error clearing cache:', error.message);
    console.log('\nTroubleshooting:');
    console.log('• Make sure Redis is running');
    console.log('• Check Redis connection settings in your config');
    console.log('• You can also manually restart Redis to clear all data');
  }
  
  // Don't disconnect here as it might cause issues
  console.log('\n💡 Cache clearing complete!');
  process.exit(0);
}

clearCache().catch(console.error);