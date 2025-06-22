const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({
    region: process.env.AWS_REGION || 'us-east-1' 
});

class AdminEmailService {
  constructor() {
    this.cachedEmails = null;
    this.lastFetch = 0;
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes
  }

  async getAdminEmails() {
    const now = Date.now();

    if (this.cachedEmails && (now - this.lastFetch) < this.cacheDuration) {
      console.log('Returning cached admin emails.');
      return this.cachedEmails;
    }

    try {
      console.log('Fetching admin emails from Secrets Manager...');
      const secret = await secretsManager.getSecretValue({
        SecretId: process.env.ADMIN_EMAILS_SECRET_NAME || 'AdminEmails'
      }).promise();

      if (secret.SecretString) {
        const secretData = JSON.parse(secret.SecretString);
        const emailString = secretData.ADMIN_EMAILS;
        
        if (emailString) {
          this.cachedEmails = emailString.split(',').map(email => email.trim());
          this.lastFetch = now;
          console.log('Successfully fetched and cached admin emails.');
          return this.cachedEmails;
        }
      }
      // If SecretString or ADMIN_EMAILS is not found, fallback.
      console.log('ADMIN_EMAILS key not found in secret, using fallback.');
      return this.getFallbackEmails();

    } catch (error) {
      console.error('Failed to fetch admin emails from Secrets Manager:', error);
      return this.getFallbackEmails();
    }
  }

  getFallbackEmails() {
    console.log('Using fallback admin emails.');
    const fallbackEmails = process.env.FALLBACK_ADMIN_EMAILS;
    return fallbackEmails ? fallbackEmails.split(',').map(email => email.trim()) : [];
  }
}

module.exports = new AdminEmailService(); 