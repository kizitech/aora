const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

// Prisma client configuration
const prismaConfig = {
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
  errorFormat: 'pretty',
};

// Add connection pooling for production
if (process.env.NODE_ENV === 'production') {
  prismaConfig.datasources = {
    db: {
      url: process.env.DATABASE_URL,
    },
  };
}

const prisma = new PrismaClient(prismaConfig);

// Log database queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug('Query: ' + e.query);
    logger.debug('Params: ' + e.params);
    logger.debug('Duration: ' + e.duration + 'ms');
  });
}

// Log database errors
prisma.$on('error', (e) => {
  logger.error('Database error:', e);
});

// Log database info
prisma.$on('info', (e) => {
  logger.info('Database info:', e.message);
});

// Log database warnings
prisma.$on('warn', (e) => {
  logger.warn('Database warning:', e.message);
});

// Test database connection
async function connectToDatabase() {
  try {
    await prisma.$connect();
    logger.info('Successfully connected to database');
    
    // Test query
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database health check passed');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function disconnectFromDatabase() {
  try {
    await prisma.$disconnect();
    logger.info('Disconnected from database');
  } catch (error) {
    logger.error('Error disconnecting from database:', error);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  await disconnectFromDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectFromDatabase();
  process.exit(0);
});

module.exports = {
  prisma,
  connectToDatabase,
  disconnectFromDatabase,
};