const logger = require('../config/logger');

// Custom error class
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

// Prisma error handler
const handlePrismaError = (error) => {
  if (error.code === 'P2002') {
    // Unique constraint violation
    const field = error.meta?.target?.[0] || 'field';
    return new AppError(`${field} already exists`, 400);
  }
  
  if (error.code === 'P2025') {
    // Record not found
    return new AppError('Record not found', 404);
  }

  if (error.code === 'P2003') {
    // Foreign key constraint violation
    return new AppError('Referenced record does not exist', 400);
  }

  if (error.code === 'P2014') {
    // Required relation violation
    return new AppError('Invalid relation data', 400);
  }

  // Default Prisma error
  return new AppError('Database operation failed', 500);
};

// Validation error handler
const handleValidationError = (error) => {
  const errors = Object.values(error.errors).map(err => err.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// JWT error handler
const handleJWTError = () => new AppError('Invalid token. Please log in again!', 401);
const handleJWTExpiredError = () => new AppError('Your token has expired! Please log in again.', 401);

// Multer error handler
const handleMulterError = (error) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return new AppError('File too large', 400);
  }
  if (error.code === 'LIMIT_FILE_COUNT') {
    return new AppError('Too many files', 400);
  }
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError('Unexpected file field', 400);
  }
  return new AppError('File upload error', 400);
};

// Send error response in development
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

// Send error response in production
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR 💥', err);

    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Main error handling middleware
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error
  if (err.statusCode >= 500) {
    logger.error('Server Error:', {
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id
    });
  } else {
    logger.warn('Client Error:', {
      error: err.message,
      url: req.url,
      method: req.method,
      ip: req.ip,
      statusCode: err.statusCode
    });
  }

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (err.name === 'PrismaClientKnownRequestError') {
      error = handlePrismaError(err);
    }
    
    if (err.name === 'ValidationError') {
      error = handleValidationError(err);
    }
    
    if (err.name === 'JsonWebTokenError') {
      error = handleJWTError();
    }
    
    if (err.name === 'TokenExpiredError') {
      error = handleJWTExpiredError();
    }

    if (err.name === 'MulterError') {
      error = handleMulterError(err);
    }

    sendErrorProd(error, res);
  }
};

// Async error wrapper
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// 404 handler
const notFound = (req, res, next) => {
  const err = new AppError(`Can't find ${req.originalUrl} on this server!`, 404);
  next(err);
};

module.exports = {
  errorHandler,
  AppError,
  catchAsync,
  notFound
};