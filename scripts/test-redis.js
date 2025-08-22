#!/usr/bin/env node

const redis = require('redis');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function testRedisConnection() {
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = process.env.REDIS_PORT || 6379;
  const redisPassword = process.env.REDIS_PASSWORD || '';
  const redisDb = process.env.REDIS_DB || 0;

  const client = redis.createClient({
    host: redisHost,
    port: redisPort,
    password: redisPassword || undefined,
    database: redisDb,
    retry_strategy: (options) => {
      return null; // Don't retry for this test
    }
  });

  try {
    console.log('🔍 Testing Redis connection...');
    console.log(`Host: ${redisHost}:${redisPort}`);
    console.log(`Database: ${redisDb}`);

    await client.connect();
    console.log('✅ Redis connection successful');

    // Test ping
    const pong = await client.ping();
    console.log('✅ Redis ping:', pong);

    // Test set/get
    await client.set('test:connection', 'success');
    const value = await client.get('test:connection');
    console.log('✅ Redis set/get test:', value);

    // Get Redis info
    const info = await client.info('server');
    const version = info.split('\n').find(line => line.startsWith('redis_version:'));
    if (version) {
      console.log('✅ Redis Version:', version.split(':')[1].trim());
    }

    // Clean up test key
    await client.del('test:connection');

    await client.disconnect();
    console.log('✅ Redis test completed successfully!');

  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure Redis is running:');
      console.error('   - macOS: brew services start redis');
      console.error('   - Ubuntu: sudo systemctl start redis-server');
      console.error('   - Docker: docker run -d --name redis -p 6379:6379 redis:6-alpine');
    } else if (error.code === 'WRONGPASS') {
      console.error('\n💡 Redis authentication failed. Check your Redis password in .env file');
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  testRedisConnection();
}

module.exports = { testRedisConnection };