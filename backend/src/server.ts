import app from './app';
import { config } from './config/config';
import { pool } from './config/database';
import { connectRedis } from './config/redis';
import { redisService } from './services/cache/redisService';

const PORT = config.port || 3001;

async function startServer() {
  try {
    // Test database connection (optional for search functionality)
    try {
      await pool.query('SELECT NOW()');
      console.log('✅ Database connection verified');
    } catch (dbError: any) {
      console.warn('⚠️  Database connection failed (search will still work):', dbError.message);
    }

    // Connect to Redis (optional, app works without it)
    try {
      await connectRedis();
      
      // Test enhanced Redis service
      console.log('🧪 Testing Enhanced Redis Service...');
      const testKey = 'startup:test';
      const testResult = await redisService.set(testKey, { status: 'startup_test', timestamp: new Date().toISOString() }, 10);
      if (testResult) {
        const retrieved = await redisService.get(testKey);
        console.log('✅ Enhanced Redis Service working:', retrieved ? '✓' : '✗');
      }
    } catch (redisError: any) {
      console.warn('⚠️  Redis connection failed (search will be slower):', redisError.message);
    }

    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📚 Liner Notes Discovery API`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/search/health`);
      console.log(`🔗 Enhanced search: http://localhost:${PORT}/api/search/songs?q=Come%20Together%20Beatles`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('');
      console.log('🎵 Ready to test enhanced search with smart prioritization!');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();