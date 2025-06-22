// scripts/generate-server-keys.js
// Generates a public/private RSA key pair for the server.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const keysDir = path.join(__dirname, '..', '.keys');

if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir);
}

const generateKeys = () => {
  console.log('Generating server key pair...');

  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  const privateKeyPath = path.join(keysDir, 'server_private_key.pem');
  const publicKeyPath = path.join(keysDir, 'server_public_key.pem');

  fs.writeFileSync(privateKeyPath, privateKey);
  fs.writeFileSync(publicKeyPath, publicKey);

  console.log('✅ Keys generated successfully!');
  console.log(`- Private Key: ${privateKeyPath}`);
  console.log(`- Public Key:  ${publicKeyPath}`);
  console.log('\n--- IMPORTANT SECURITY NOTICE ---');
  console.log('1. The `.keys` directory and its contents are highly sensitive.');
  console.log('2. Ensure `.keys/` is added to your .gitignore file immediately.');
  console.log('3. For production, do NOT commit these keys. Load them securely from a secrets manager (e.g., AWS Secrets Manager, HashiCorp Vault).');
  console.log('---------------------------------');
};

generateKeys(); 