const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const logger = require('../config/logger');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch user from database to ensure they still exist and get latest data
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        avatarUrl: true,
        walletAddress: true,
        isVerified: true,
        emailVerified: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    } else {
      logger.error('Token verification error:', error);
      return res.status(500).json({ error: 'Token verification failed' });
    }
  }
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        avatarUrl: true,
        walletAddress: true,
        isVerified: true,
        emailVerified: true
      }
    });

    req.user = user;
  } catch (error) {
    req.user = null;
  }

  next();
};

// Check if user has admin role
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

// Check if user is verified
const requireVerifiedUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.isVerified) {
    return res.status(403).json({ 
      error: 'Account verification required',
      message: 'Please verify your account to access this feature'
    });
  }

  next();
};

// Check if user has connected wallet
const requireWallet = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.walletAddress) {
    return res.status(403).json({ 
      error: 'Wallet connection required',
      message: 'Please connect your wallet to access this feature'
    });
  }

  next();
};

// Check if user owns the resource or is admin
const requireOwnershipOrAdmin = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admin can access everything
    if (req.user.role === 'ADMIN') {
      return next();
    }

    // Check ownership
    const resourceUserId = req.params.userId || req.body[resourceUserIdField] || req.resource?.[resourceUserIdField];
    
    if (req.user.id !== resourceUserId) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You can only access your own resources'
      });
    }

    next();
  };
};

// Rate limiting for authenticated users
const authRateLimit = (req, res, next) => {
  // Higher limits for authenticated users
  if (req.user) {
    req.rateLimit = {
      max: req.user.role === 'ADMIN' ? 1000 : 200,
      windowMs: 15 * 60 * 1000 // 15 minutes
    };
  }
  next();
};

// Validate refresh token
const validateRefreshToken = async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Check if refresh token exists in database
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            role: true,
            avatarUrl: true,
            walletAddress: true,
            isVerified: true,
            emailVerified: true
          }
        }
      }
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    req.user = tokenRecord.user;
    req.refreshToken = tokenRecord;
    next();
  } catch (error) {
    logger.error('Refresh token validation error:', error);
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAdmin,
  requireVerifiedUser,
  requireWallet,
  requireOwnershipOrAdmin,
  authRateLimit,
  validateRefreshToken
};