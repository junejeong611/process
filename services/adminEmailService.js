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
      return this.cachedEmails;
    }

    try {
      const secret = await secretsManager.getSecretValue({
        SecretId: process.env.ADMIN_EMAILS_SECRET_NAME || 'process-it/dev/secrets'
      }).promise();

      if (secret.SecretString) {
        const secretData = JSON.parse(secret.SecretString);
        const emailString = secretData.ADMIN_EMAILS;
        
        if (emailString) {
          this.cachedEmails = emailString.split(',').map(email => email.trim());
          this.lastFetch = now;
          return this.cachedEmails;
        }
      }
      // If SecretString or ADMIN_EMAILS is not found, fallback.
      return this.getFallbackEmails();

    } catch (error) {
      return this.getFallbackEmails();
    }
  }

  getFallbackEmails() {
    const fallbackEmails = process.env.FALLBACK_ADMIN_EMAILS;
    return fallbackEmails ? fallbackEmails.split(',').map(email => email.trim()) : [];
  }
}

module.exports = new AdminEmailService(); 