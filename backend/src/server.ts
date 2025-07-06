import app from './app';
import { config } from './config/config';
import { pool } from './config/database';
import { connectRedis } from './config/redis';

const PORT = config.port || 3001;

async function startServer() {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection verified');

    // Connect to Redis (optional, app works without it)
    await connectRedis();

    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📚 Liner Notes Discovery API`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();