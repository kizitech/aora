require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const http = require('http');
const socketIo = require('socket.io');

// Import configurations
const logger = require('./config/logger');
const { connectToDatabase } = require('./config/database');
const { createRedisClient, createSessionStore } = require('./config/redis');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const nftRoutes = require('./routes/nfts');
const orderRoutes = require('./routes/orders');
const cartRoutes = require('./routes/cart');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');
const blockchainRoutes = require('./routes/blockchain');

// Import passport configuration
require('./config/passport');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Global variables
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// Trust proxy (important for rate limiting and getting real IPs)
app.set('trust proxy', 1);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
      scriptSrc: ["'self'", 'https:'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: ["'self'", 'https:', 'wss:'],
      fontSrc: ["'self'", 'https:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", 'https:', 'blob:'],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for admin users (optional)
    return req.user && req.user.role === 'ADMIN';
  }
});

// Apply rate limiting to all requests
app.use(limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  skipSuccessfulRequests: true
});

// CORS
app.use(cors(corsOptions));

// HTTP request logging
app.use(morgan('combined', { stream: logger.stream }));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration (after Redis is ready)
let sessionMiddleware;

async function setupSession() {
  try {
    const redisClient = createRedisClient();
    await redisClient.connect();
    
    const RedisStore = createSessionStore();
    
    sessionMiddleware = session({
      store: RedisStore,
      secret: process.env.JWT_SECRET || 'your-session-secret',
      resave: false,
      saveUninitialized: false,
      name: 'nft-marketplace-session',
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
      }
    });
    
    app.use(sessionMiddleware);
    logger.info('Session middleware configured');
  } catch (error) {
    logger.error('Failed to setup session store:', error);
    // Fallback to memory store (not recommended for production)
    sessionMiddleware = session({
      secret: process.env.JWT_SECRET || 'your-session-secret',
      resave: false,
      saveUninitialized: false,
      name: 'nft-marketplace-session',
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
      }
    });
    app.use(sessionMiddleware);
  }
}

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/nfts', nftRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/blockchain', blockchainRoutes);

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'NFT Marketplace API',
    version: '1.0.0',
    description: 'API documentation for the NFT Marketplace',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register a new user',
        'POST /api/auth/login': 'Login user',
        'POST /api/auth/logout': 'Logout user',
        'POST /api/auth/refresh': 'Refresh access token',
        'POST /api/auth/connect-wallet': 'Connect wallet with mnemonic',
        'POST /api/auth/forgot-password': 'Request password reset',
        'POST /api/auth/reset-password': 'Reset password'
      },
      users: {
        'GET /api/users/profile': 'Get user profile',
        'PUT /api/users/profile': 'Update user profile',
        'GET /api/users/:id': 'Get user by ID',
        'GET /api/users/:id/nfts': 'Get user NFTs',
        'GET /api/users/:id/collections': 'Get user collections'
      },
      nfts: {
        'GET /api/nfts': 'Get NFTs with pagination and filters',
        'GET /api/nfts/:id': 'Get NFT by ID',
        'POST /api/nfts': 'Create new NFT',
        'PUT /api/nfts/:id': 'Update NFT',
        'DELETE /api/nfts/:id': 'Delete NFT',
        'POST /api/nfts/:id/like': 'Like/unlike NFT'
      },
      orders: {
        'GET /api/orders': 'Get user orders',
        'POST /api/orders': 'Create new order',
        'GET /api/orders/:id': 'Get order by ID',
        'PUT /api/orders/:id/status': 'Update order status'
      },
      cart: {
        'GET /api/cart': 'Get user cart',
        'POST /api/cart': 'Add item to cart',
        'DELETE /api/cart/:id': 'Remove item from cart',
        'DELETE /api/cart': 'Clear cart'
      },
      admin: {
        'GET /api/admin/dashboard': 'Get dashboard stats',
        'GET /api/admin/nfts/pending': 'Get pending NFTs',
        'PUT /api/admin/nfts/:id/approve': 'Approve NFT',
        'PUT /api/admin/nfts/:id/reject': 'Reject NFT',
        'GET /api/admin/users': 'Get users list',
        'GET /api/admin/orders': 'Get orders list',
        'GET /api/admin/analytics': 'Get analytics data'
      },
      upload: {
        'POST /api/upload/image': 'Upload image file',
        'POST /api/upload/metadata': 'Upload metadata to IPFS'
      },
      blockchain: {
        'POST /api/blockchain/mint': 'Mint NFT on blockchain',
        'POST /api/blockchain/transfer': 'Transfer NFT',
        'GET /api/blockchain/transaction/:hash': 'Get transaction details',
        'POST /api/blockchain/verify-payment': 'Verify payment transaction'
      }
    }
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);
  
  // Join user-specific room for notifications
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    logger.debug(`User ${userId} joined room`);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});

// Make io available to other modules
app.set('socketio', io);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The requested endpoint ${req.method} ${req.originalUrl} was not found on this server.`
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectToDatabase();
    
    // Setup session store
    await setupSession();
    
    // Start listening
    server.listen(PORT, HOST, () => {
      logger.info(`🚀 Server running on http://${HOST}:${PORT}`);
      logger.info(`📚 API docs available at http://${HOST}:${PORT}/api/docs`);
      logger.info(`🏥 Health check at http://${HOST}:${PORT}/health`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

module.exports = { app, server, io };