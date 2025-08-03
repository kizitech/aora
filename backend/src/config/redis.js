const Redis = require('ioredis');
const logger = require('./logger');

let redisClient = null;

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4,
  db: 0,
};

// Parse Redis URL if provided
if (process.env.REDIS_URL) {
  const redisUrl = new URL(process.env.REDIS_URL);
  redisConfig.host = redisUrl.hostname;
  redisConfig.port = parseInt(redisUrl.port) || 6379;
  if (redisUrl.password) {
    redisConfig.password = redisUrl.password;
  }
}

function createRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  redisClient = new Redis(redisConfig);

  redisClient.on('connect', () => {
    logger.info('Connected to Redis');
  });

  redisClient.on('ready', () => {
    logger.info('Redis client ready');
  });

  redisClient.on('error', (error) => {
    logger.error('Redis connection error:', error);
  });

  redisClient.on('close', () => {
    logger.warn('Redis connection closed');
  });

  redisClient.on('reconnecting', () => {
    logger.info('Reconnecting to Redis...');
  });

  return redisClient;
}

// Cache helper functions
const cache = {
  // Get value from cache
  async get(key) {
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis GET error:', error);
      return null;
    }
  },

  // Set value in cache with optional TTL
  async set(key, value, ttlSeconds = 3600) {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await redisClient.setex(key, ttlSeconds, serialized);
      } else {
        await redisClient.set(key, serialized);
      }
      return true;
    } catch (error) {
      logger.error('Redis SET error:', error);
      return false;
    }
  },

  // Delete key from cache
  async del(key) {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.error('Redis DEL error:', error);
      return false;
    }
  },

  // Check if key exists
  async exists(key) {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error:', error);
      return false;
    }
  },

  // Increment value
  async incr(key) {
    try {
      return await redisClient.incr(key);
    } catch (error) {
      logger.error('Redis INCR error:', error);
      return null;
    }
  },

  // Set with expiration
  async expire(key, seconds) {
    try {
      await redisClient.expire(key, seconds);
      return true;
    } catch (error) {
      logger.error('Redis EXPIRE error:', error);
      return false;
    }
  },

  // Add to set
  async sadd(key, ...members) {
    try {
      return await redisClient.sadd(key, ...members);
    } catch (error) {
      logger.error('Redis SADD error:', error);
      return null;
    }
  },

  // Remove from set
  async srem(key, ...members) {
    try {
      return await redisClient.srem(key, ...members);
    } catch (error) {
      logger.error('Redis SREM error:', error);
      return null;
    }
  },

  // Check if member in set
  async sismember(key, member) {
    try {
      const result = await redisClient.sismember(key, member);
      return result === 1;
    } catch (error) {
      logger.error('Redis SISMEMBER error:', error);
      return false;
    }
  },

  // Get all set members
  async smembers(key) {
    try {
      return await redisClient.smembers(key);
    } catch (error) {
      logger.error('Redis SMEMBERS error:', error);
      return [];
    }
  }
};

// Session store configuration for express-session
function createSessionStore() {
  const ConnectRedis = require('connect-redis');
  return new ConnectRedis({
    client: redisClient,
    prefix: 'nft-marketplace:sess:',
    ttl: 86400, // 1 day
  });
}

// Graceful shutdown
async function disconnectRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('Disconnected from Redis');
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
    }
  }
}

module.exports = {
  createRedisClient,
  createSessionStore,
  cache,
  disconnectRedis,
  get redisClient() {
    return redisClient;
  }
};