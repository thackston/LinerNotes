import { createClient } from 'redis';
import { config } from './config';

const redisClient = createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port,
  },
  password: config.redis.password || undefined,
});

redisClient.on('error', (err) => {
  console.error('❌ Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Connected to Redis');
});

redisClient.on('ready', () => {
  console.log('🚀 Redis client ready');
});

redisClient.on('end', () => {
  console.log('🔌 Redis connection closed');
});

// Connect to Redis
async function connectRedis() {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
    // Don't exit the process, just log the error
    // The app can still function without Redis caching
  }
}

// Cache utilities
export class CacheService {
  static async get(key: string): Promise<string | null> {
    try {
      return await redisClient.get(key);
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  static async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    try {
      if (ttlSeconds) {
        await redisClient.setEx(key, ttlSeconds, value);
      } else {
        await redisClient.set(key, value);
      }
      return true;
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  }

  static async del(key: string): Promise<boolean> {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Redis DEL error:', error);
      return false;
    }
  }

  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  }

  // API response caching
  static async cacheApiResponse(endpoint: string, params: any, response: any, ttlSeconds: number = 3600): Promise<void> {
    const cacheKey = `api:${endpoint}:${JSON.stringify(params)}`;
    await this.set(cacheKey, JSON.stringify(response), ttlSeconds);
  }

  static async getCachedApiResponse(endpoint: string, params: any): Promise<any | null> {
    const cacheKey = `api:${endpoint}:${JSON.stringify(params)}`;
    const cached = await this.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  // User session caching
  static async cacheUserSession(sessionToken: string, userData: any, ttlSeconds: number = 604800): Promise<void> {
    const cacheKey = `session:${sessionToken}`;
    await this.set(cacheKey, JSON.stringify(userData), ttlSeconds);
  }

  static async getCachedUserSession(sessionToken: string): Promise<any | null> {
    const cacheKey = `session:${sessionToken}`;
    const cached = await this.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  static async clearUserSession(sessionToken: string): Promise<void> {
    const cacheKey = `session:${sessionToken}`;
    await this.del(cacheKey);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await redisClient.quit();
    console.log('🔌 Redis connection closed gracefully');
  } catch (error) {
    console.error('Error closing Redis connection:', error);
  }
});

export { redisClient, connectRedis };