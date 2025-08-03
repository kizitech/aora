const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/database');
const { cache } = require('../config/redis');
const logger = require('../config/logger');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { authenticateToken, validateRefreshToken } = require('../middleware/auth');
const { hashPassword, verifyPassword, generateToken, encryptMnemonic, decryptMnemonic } = require('../utils/crypto');
const { deriveWalletFromMnemonic, isValidMnemonic, getChecksumAddress } = require('../utils/wallet');
const { sendEmail } = require('../services/emailService');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('username').isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/).withMessage('Username must be 3-30 characters, alphanumeric and underscore only'),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const connectWalletValidation = [
  body('mnemonic').custom((value) => {
    if (!value || !isValidMnemonic(value)) {
      throw new Error('Invalid mnemonic phrase');
    }
    return true;
  }),
];

const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
];

// Helper functions
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
  });
  
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  });
  
  return { accessToken, refreshToken };
};

const storeRefreshToken = async (userId, refreshToken) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
  
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      expiresAt
    }
  });
};

const cleanupExpiredTokens = async (userId) => {
  await prisma.refreshToken.deleteMany({
    where: {
      userId,
      expiresAt: {
        lt: new Date()
      }
    }
  });
};

// Routes

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', registerValidation, catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { email, username, password } = req.body;

  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        { username }
      ]
    }
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new AppError('Email already registered', 400);
    }
    if (existingUser.username === username) {
      throw new AppError('Username already taken', 400);
    }
  }

  // Hash password
  const passwordHash = await hashPassword(password);
  
  // Generate verification token
  const verificationToken = generateToken();

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
      verificationToken
    },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      isVerified: true,
      emailVerified: true,
      createdAt: true
    }
  });

  // Send verification email
  try {
    await sendEmail({
      to: email,
      subject: 'Verify Your NFT Marketplace Account',
      template: 'verification',
      data: {
        username,
        verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`
      }
    });
  } catch (emailError) {
    logger.error('Failed to send verification email:', emailError);
    // Don't fail registration if email fails
  }

  logger.info(`New user registered: ${email}`);

  res.status(201).json({
    message: 'User registered successfully. Please check your email for verification.',
    user
  });
}));

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', loginValidation, catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { email, password } = req.body;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      username: true,
      passwordHash: true,
      role: true,
      avatarUrl: true,
      walletAddress: true,
      isVerified: true,
      emailVerified: true
    }
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new AppError('Invalid email or password', 401);
  }

  // Clean up expired tokens
  await cleanupExpiredTokens(user.id);

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user.id);
  
  // Store refresh token
  await storeRefreshToken(user.id, refreshToken);

  // Remove password hash from response
  const { passwordHash, ...userWithoutPassword } = user;

  logger.info(`User logged in: ${email}`);

  res.json({
    message: 'Login successful',
    user: userWithoutPassword,
    accessToken,
    refreshToken
  });
}));

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticateToken, catchAsync(async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    // Add token to blacklist (cache for remaining TTL)
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await cache.set(`blacklist:${token}`, true, ttl);
      }
    }
  }

  // Remove refresh tokens
  await prisma.refreshToken.deleteMany({
    where: { userId: req.user.id }
  });

  logger.info(`User logged out: ${req.user.email}`);

  res.json({ message: 'Logout successful' });
}));

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', validateRefreshToken, catchAsync(async (req, res) => {
  const { user, refreshToken: tokenRecord } = req;

  // Generate new tokens
  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id);

  // Remove old refresh token
  await prisma.refreshToken.delete({
    where: { id: tokenRecord.id }
  });

  // Store new refresh token
  await storeRefreshToken(user.id, newRefreshToken);

  res.json({
    accessToken,
    refreshToken: newRefreshToken
  });
}));

/**
 * @route   POST /api/auth/connect-wallet
 * @desc    Connect wallet using mnemonic phrase
 * @access  Private
 */
router.post('/connect-wallet', authenticateToken, connectWalletValidation, catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { mnemonic } = req.body;
  const userId = req.user.id;

  // Derive wallet from mnemonic
  const wallet = deriveWalletFromMnemonic(mnemonic);
  const walletAddress = getChecksumAddress(wallet.address);

  // Check if wallet is already connected to another user
  const existingWallet = await prisma.user.findFirst({
    where: {
      walletAddress,
      id: { not: userId }
    }
  });

  if (existingWallet) {
    throw new AppError('This wallet is already connected to another account', 400);
  }

  // Encrypt mnemonic
  const encryptedMnemonic = encryptMnemonic(mnemonic, userId);

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      encryptedMnemonic,
      walletAddress,
      isVerified: true // Auto-verify when wallet is connected
    },
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

  logger.info(`Wallet connected for user: ${req.user.email}, address: ${walletAddress}`);

  res.json({
    message: 'Wallet connected successfully',
    user: updatedUser
  });
}));

/**
 * @route   POST /api/auth/disconnect-wallet
 * @desc    Disconnect wallet
 * @access  Private
 */
router.post('/disconnect-wallet', authenticateToken, catchAsync(async (req, res) => {
  const userId = req.user.id;

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      encryptedMnemonic: null,
      walletAddress: null
    },
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

  logger.info(`Wallet disconnected for user: ${req.user.email}`);

  res.json({
    message: 'Wallet disconnected successfully',
    user: updatedUser
  });
}));

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 */
router.post('/verify-email', catchAsync(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw new AppError('Verification token is required', 400);
  }

  const user = await prisma.user.findFirst({
    where: { verificationToken: token }
  });

  if (!user) {
    throw new AppError('Invalid or expired verification token', 400);
  }

  // Update user
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationToken: null
    }
  });

  logger.info(`Email verified for user: ${user.email}`);

  res.json({ message: 'Email verified successfully' });
}));

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend verification email
 * @access  Private
 */
router.post('/resend-verification', authenticateToken, catchAsync(async (req, res) => {
  const user = req.user;

  if (user.emailVerified) {
    throw new AppError('Email is already verified', 400);
  }

  // Generate new verification token
  const verificationToken = generateToken();

  // Update user
  await prisma.user.update({
    where: { id: user.id },
    data: { verificationToken }
  });

  // Send verification email
  await sendEmail({
    to: user.email,
    subject: 'Verify Your NFT Marketplace Account',
    template: 'verification',
    data: {
      username: user.username,
      verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`
    }
  });

  res.json({ message: 'Verification email sent successfully' });
}));

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', forgotPasswordValidation, catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { email } = req.body;

  const user = await prisma.user.findUnique({
    where: { email }
  });

  // Always return success to prevent email enumeration
  if (!user) {
    return res.json({ message: 'If the email exists, a reset link has been sent' });
  }

  // Generate reset token
  const resetToken = generateToken();
  const resetTokenExpiry = new Date();
  resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // 1 hour

  // Update user
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken,
      resetTokenExpiry
    }
  });

  // Send reset email
  try {
    await sendEmail({
      to: email,
      subject: 'Password Reset - NFT Marketplace',
      template: 'password-reset',
      data: {
        username: user.username,
        resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
      }
    });
  } catch (emailError) {
    logger.error('Failed to send password reset email:', emailError);
  }

  res.json({ message: 'If the email exists, a reset link has been sent' });
}));

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password
 * @access  Public
 */
router.post('/reset-password', resetPasswordValidation, catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { token, password } = req.body;

  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: {
        gt: new Date()
      }
    }
  });

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  // Hash new password
  const passwordHash = await hashPassword(password);

  // Update user
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null
    }
  });

  // Remove all refresh tokens (force re-login)
  await prisma.refreshToken.deleteMany({
    where: { userId: user.id }
  });

  logger.info(`Password reset for user: ${user.email}`);

  res.json({ message: 'Password reset successfully' });
}));

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authenticateToken, catchAsync(async (req, res) => {
  res.json({ user: req.user });
}));

module.exports = router;