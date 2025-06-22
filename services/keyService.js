 // services/keyService.js
// Manages loading and providing access to server encryption keys.

const fs = require('fs');
const path = require('path');

const keysDir = path.join(__dirname, '..', '.keys');
const privateKeyPath = path.join(keysDir, 'server_private_key.pem');
const publicKeyPath = path.join(keysDir, 'server_public_key.pem');

let privateKey = null;
let publicKey = null;

/**
 * Loads the server's public and private keys from the file system.
 */
function loadKeys() {
  try {
    if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
      privateKey = fs.readFileSync(privateKeyPath, 'utf8');
      publicKey = fs.readFileSync(publicKeyPath, 'utf8');
      console.log('✅ Server encryption keys loaded successfully.');
    } else {
      console.error('❌ CRITICAL ERROR: Encryption key files not found.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ CRITICAL ERROR: Failed to load encryption keys.', error);
    process.exit(1);
  }
}

function getPublicKey() {
  if (!publicKey) throw new Error('Public key not loaded.');
  return publicKey;
}

function getPrivateKey() {
  if (!privateKey) throw new Error('Private key not loaded.');
  return privateKey;
}

module.exports = {
  loadKeys,
  getPublicKey,
  getPrivateKey,
};