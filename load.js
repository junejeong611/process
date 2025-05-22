// load.js
const AWS = require('aws-sdk');

// Use default credentials and region from your local AWS CLI
const client = new AWS.SecretsManager({ region: 'us-east-1' });

async function getSecrets(secretName) {
  try {
    const data = await client.getSecretValue({ SecretId: secretName }).promise();
    return JSON.parse(data.SecretString);
  } catch (err) {
    console.error('Error fetching secrets:', err);
    throw err;
  }
}

module.exports = getSecrets;
