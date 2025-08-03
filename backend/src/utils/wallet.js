const { ethers } = require('ethers');
const logger = require('../config/logger');

/**
 * Derive Ethereum wallet from mnemonic phrase
 * @param {string} mnemonic - BIP39 mnemonic phrase
 * @param {number} accountIndex - Account index (default 0)
 * @returns {object} - Wallet object with address and private key
 */
function deriveWalletFromMnemonic(mnemonic, accountIndex = 0) {
  try {
    // Validate mnemonic
    if (!ethers.Mnemonic.isValidMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase');
    }

    // Create wallet from mnemonic
    const wallet = ethers.Wallet.fromPhrase(mnemonic, null, `m/44'/60'/0'/0/${accountIndex}`);
    
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      publicKey: wallet.publicKey
    };
  } catch (error) {
    logger.error('Wallet derivation error:', error);
    throw new Error('Failed to derive wallet from mnemonic');
  }
}

/**
 * Validate Ethereum address format
 * @param {string} address - Ethereum address to validate
 * @returns {boolean} - Whether address is valid
 */
function isValidAddress(address) {
  try {
    return ethers.isAddress(address);
  } catch (error) {
    return false;
  }
}

/**
 * Get checksum address
 * @param {string} address - Ethereum address
 * @returns {string} - Checksum address
 */
function getChecksumAddress(address) {
  try {
    return ethers.getAddress(address);
  } catch (error) {
    throw new Error('Invalid Ethereum address');
  }
}

/**
 * Validate mnemonic phrase using ethers
 * @param {string} mnemonic - Mnemonic phrase to validate
 * @returns {boolean} - Whether mnemonic is valid
 */
function isValidMnemonic(mnemonic) {
  try {
    return ethers.Mnemonic.isValidMnemonic(mnemonic.trim());
  } catch (error) {
    return false;
  }
}

/**
 * Generate a new random mnemonic phrase
 * @param {number} strength - Entropy strength (128, 160, 192, 224, 256)
 * @returns {string} - New mnemonic phrase
 */
function generateMnemonic(strength = 128) {
  try {
    const mnemonic = ethers.Mnemonic.fromEntropy(ethers.randomBytes(strength / 8));
    return mnemonic.phrase;
  } catch (error) {
    logger.error('Mnemonic generation error:', error);
    throw new Error('Failed to generate mnemonic');
  }
}

/**
 * Sign message with private key
 * @param {string} message - Message to sign
 * @param {string} privateKey - Private key for signing
 * @returns {string} - Signature
 */
async function signMessage(message, privateKey) {
  try {
    const wallet = new ethers.Wallet(privateKey);
    return await wallet.signMessage(message);
  } catch (error) {
    logger.error('Message signing error:', error);
    throw new Error('Failed to sign message');
  }
}

/**
 * Verify message signature
 * @param {string} message - Original message
 * @param {string} signature - Signature to verify
 * @param {string} expectedAddress - Expected signer address
 * @returns {boolean} - Whether signature is valid
 */
function verifySignature(message, signature, expectedAddress) {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    logger.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Get wallet balance for ETH
 * @param {string} address - Wallet address
 * @param {string} rpcUrl - RPC URL
 * @returns {string} - Balance in ETH
 */
async function getEthBalance(address, rpcUrl) {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch (error) {
    logger.error('Balance fetch error:', error);
    throw new Error('Failed to fetch balance');
  }
}

/**
 * Get ERC-20 token balance
 * @param {string} address - Wallet address
 * @param {string} tokenAddress - Token contract address
 * @param {string} rpcUrl - RPC URL
 * @returns {string} - Token balance
 */
async function getTokenBalance(address, tokenAddress, rpcUrl) {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // ERC-20 ABI for balanceOf function
    const erc20ABI = [
      'function balanceOf(address owner) view returns (uint256)',
      'function decimals() view returns (uint8)'
    ];
    
    const contract = new ethers.Contract(tokenAddress, erc20ABI, provider);
    const balance = await contract.balanceOf(address);
    const decimals = await contract.decimals();
    
    return ethers.formatUnits(balance, decimals);
  } catch (error) {
    logger.error('Token balance fetch error:', error);
    throw new Error('Failed to fetch token balance');
  }
}

/**
 * Estimate gas for transaction
 * @param {object} transaction - Transaction object
 * @param {string} rpcUrl - RPC URL
 * @returns {string} - Estimated gas
 */
async function estimateGas(transaction, rpcUrl) {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const gasEstimate = await provider.estimateGas(transaction);
    return gasEstimate.toString();
  } catch (error) {
    logger.error('Gas estimation error:', error);
    throw new Error('Failed to estimate gas');
  }
}

/**
 * Get current gas price
 * @param {string} rpcUrl - RPC URL
 * @returns {string} - Gas price in Gwei
 */
async function getGasPrice(rpcUrl) {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const gasPrice = await provider.getFeeData();
    return ethers.formatUnits(gasPrice.gasPrice, 'gwei');
  } catch (error) {
    logger.error('Gas price fetch error:', error);
    throw new Error('Failed to fetch gas price');
  }
}

/**
 * Create provider instance
 * @param {string} rpcUrl - RPC URL
 * @returns {ethers.JsonRpcProvider} - Provider instance
 */
function createProvider(rpcUrl) {
  try {
    return new ethers.JsonRpcProvider(rpcUrl);
  } catch (error) {
    logger.error('Provider creation error:', error);
    throw new Error('Failed to create provider');
  }
}

/**
 * Create wallet instance from private key
 * @param {string} privateKey - Private key
 * @param {ethers.Provider} provider - Provider instance
 * @returns {ethers.Wallet} - Wallet instance
 */
function createWallet(privateKey, provider) {
  try {
    return new ethers.Wallet(privateKey, provider);
  } catch (error) {
    logger.error('Wallet creation error:', error);
    throw new Error('Failed to create wallet');
  }
}

module.exports = {
  deriveWalletFromMnemonic,
  isValidAddress,
  getChecksumAddress,
  isValidMnemonic,
  generateMnemonic,
  signMessage,
  verifySignature,
  getEthBalance,
  getTokenBalance,
  estimateGas,
  getGasPrice,
  createProvider,
  createWallet
};