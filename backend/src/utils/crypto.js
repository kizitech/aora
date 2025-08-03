const crypto = require('crypto');
const CryptoJS = require('crypto-js');
const logger = require('../config/logger');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm';

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be 32 characters long');
}

/**
 * Encrypt text using AES-256-GCM
 * @param {string} text - Text to encrypt
 * @param {string} userSalt - User-specific salt (user ID)
 * @returns {object} - Encrypted data object
 */
function encrypt(text, userSalt = '') {
  try {
    const iv = crypto.randomBytes(16);
    const salt = crypto.randomBytes(32);
    
    // Derive key using PBKDF2 with user salt
    const key = crypto.pbkdf2Sync(ENCRYPTION_KEY + userSalt, salt, 100000, 32, 'sha512');
    
    const cipher = crypto.createCipher(ALGORITHM, key);
    cipher.setAAD(Buffer.from(userSalt));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      salt: salt.toString('hex'),
      authTag: authTag.toString('hex')
    };
  } catch (error) {
    logger.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt text using AES-256-GCM
 * @param {object} encryptedData - Encrypted data object
 * @param {string} userSalt - User-specific salt (user ID)
 * @returns {string} - Decrypted text
 */
function decrypt(encryptedData, userSalt = '') {
  try {
    const { encrypted, iv, salt, authTag } = encryptedData;
    
    // Derive the same key
    const key = crypto.pbkdf2Sync(ENCRYPTION_KEY + userSalt, Buffer.from(salt, 'hex'), 100000, 32, 'sha512');
    
    const decipher = crypto.createDecipher(ALGORITHM, key);
    decipher.setAAD(Buffer.from(userSalt));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Encrypt mnemonic phrase for storage
 * @param {string} mnemonic - Mnemonic phrase
 * @param {string} userId - User ID for salt
 * @returns {string} - JSON string of encrypted data
 */
function encryptMnemonic(mnemonic, userId) {
  if (!mnemonic || !userId) {
    throw new Error('Mnemonic and user ID are required');
  }
  
  const encryptedData = encrypt(mnemonic, userId);
  return JSON.stringify(encryptedData);
}

/**
 * Decrypt mnemonic phrase from storage
 * @param {string} encryptedMnemonic - JSON string of encrypted data
 * @param {string} userId - User ID for salt
 * @returns {string} - Decrypted mnemonic phrase
 */
function decryptMnemonic(encryptedMnemonic, userId) {
  if (!encryptedMnemonic || !userId) {
    throw new Error('Encrypted mnemonic and user ID are required');
  }
  
  try {
    const encryptedData = JSON.parse(encryptedMnemonic);
    return decrypt(encryptedData, userId);
  } catch (error) {
    logger.error('Mnemonic decryption error:', error);
    throw new Error('Failed to decrypt mnemonic');
  }
}

/**
 * Generate a random encryption key
 * @returns {string} - 32-character hex key
 */
function generateKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash password using bcrypt-compatible method
 * @param {string} password - Plain text password
 * @returns {string} - Hashed password
 */
async function hashPassword(password) {
  const bcrypt = require('bcryptjs');
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {boolean} - Whether password matches
 */
async function verifyPassword(password, hash) {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(password, hash);
}

/**
 * Generate secure random token
 * @param {number} bytes - Number of bytes (default 32)
 * @returns {string} - Hex token
 */
function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Hash data using SHA-256
 * @param {string} data - Data to hash
 * @returns {string} - SHA-256 hash
 */
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate HMAC signature
 * @param {string} data - Data to sign
 * @param {string} secret - Secret key
 * @returns {string} - HMAC signature
 */
function generateHMAC(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 * @param {string} data - Original data
 * @param {string} signature - HMAC signature to verify
 * @param {string} secret - Secret key
 * @returns {boolean} - Whether signature is valid
 */
function verifyHMAC(data, signature, secret) {
  const expectedSignature = generateHMAC(data, secret);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

/**
 * Validate mnemonic phrase format
 * @param {string} mnemonic - Mnemonic phrase to validate
 * @returns {boolean} - Whether mnemonic is valid format
 */
function validateMnemonic(mnemonic) {
  if (!mnemonic || typeof mnemonic !== 'string') {
    return false;
  }
  
  const words = mnemonic.trim().split(/\s+/);
  return words.length === 12 || words.length === 24;
}

module.exports = {
  encrypt,
  decrypt,
  encryptMnemonic,
  decryptMnemonic,
  generateKey,
  hashPassword,
  verifyPassword,
  generateToken,
  sha256,
  generateHMAC,
  verifyHMAC,
  validateMnemonic
};