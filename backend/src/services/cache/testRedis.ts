import { redisService } from './redisService';

/**
 * Simple test script to verify Redis service functionality
 * Run with: npx ts-node src/services/cache/testRedis.ts
 */
async function testRedisService() {
  console.log('🧪 Starting Redis Service Test...\n');

  // Wait a moment for connection
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    // Test 1: Basic get/set operations
    console.log('📝 Test 1: Basic Operations');
    const testKey = 'test:basic';
    const testValue = { message: 'Hello Redis!', timestamp: new Date().toISOString() };
    
    const setResult = await redisService.set(testKey, testValue, 60);
    console.log('SET result:', setResult);
    
    const getValue = await redisService.get(testKey);
    console.log('GET result:', getValue);
    
    // Test 2: Search key generation
    console.log('\n🔍 Test 2: Search Key Generation');
    const searchKey = redisService.generateSearchKey('The Beatles', 'Come Together');
    console.log('Generated search key:', searchKey);
    
    const albumKey = redisService.generateAlbumKey('The Beatles', 'Abbey Road');
    console.log('Generated album key:', albumKey);
    
    // Test 3: Cache search results
    console.log('\n🎯 Test 3: Search Results Caching');
    const mockResults = [
      { id: 'mb-123', title: 'Come Together', artist: 'The Beatles', album: 'Abbey Road' },
      { id: 'mb-456', title: 'Come Together', artist: 'The Beatles', album: '1962-1966' }
    ];
    
    await redisService.cacheSearchResults('The Beatles', 'Come Together', mockResults);
    const cachedResults = await redisService.getCachedSearchResults('The Beatles', 'Come Together');
    console.log('Cached results:', cachedResults);
    
    // Test 4: TTL calculation
    console.log('\n⏰ Test 4: TTL Calculation');
    const beatlesTTL = redisService.calculateSearchTTL('The Beatles');
    const unknownTTL = redisService.calculateSearchTTL('Unknown Artist');
    console.log('Beatles TTL:', beatlesTTL, 'seconds');
    console.log('Unknown Artist TTL:', unknownTTL, 'seconds');
    
    // Test 5: Cache stats
    console.log('\n📊 Test 5: Cache Statistics');
    const stats = await redisService.getCacheStats();
    console.log('Cache stats:', stats);
    
    console.log('\n✅ All Redis tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Redis test failed:', error);
  } finally {
    // Cleanup
    await redisService.del('test:basic');
    await redisService.disconnect();
    process.exit(0);
  }
}

// Run the test
testRedisService();