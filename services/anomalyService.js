const geoip = require('geoip-lite');
const { sendEmail } = require('../utils/email');
const { logEvent } = require('./auditLogService');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const FAILED_LOGIN_THRESHOLD = 5;
const LOCKOUT_DURATION_MINUTES = 15;

/**
 * Checks for login anomalies after a successful login.
 * Currently checks for logins from a new country.
 * @param {object} user - The user document.
 * @param {string} ip - The IP address of the login request.
 */
async function checkLoginAnomaly(user, ip) {
  const geo = geoip.lookup(ip);
  const country = geo ? geo.country : 'Unknown';

  // Anomaly: Login from a new country
  if (user.lastLoginCountry && user.lastLoginCountry !== 'Unknown' && user.lastLoginCountry !== country) {
    const anomalyDetails = {
      previousCountry: user.lastLoginCountry,
      currentCountry: country,
      ip: ip,
    };
    
    // Log the anomaly
    logEvent(user._id, 'ANOMALY_DETECTED', 'SUCCESS', { ipAddress: ip, details: anomalyDetails });

    // Notify the user
    await sendEmail({
      to: user.email,
      subject: 'Security Alert: New Login to Your Account',
      text: `We detected a new login to your account from ${country}, which is different from your usual location. If this was not you, please secure your account immediately by resetting your password.`,
      html: `<p>We detected a new login to your account from <strong>${country}</strong>, which is different from your usual location. If this was not you, please secure your account immediately by resetting your password.</p>`
    });
  }

  // Update user's last login location
  user.lastLoginIp = ip;
  user.lastLoginCountry = country;
  await user.save();
}

/**
 * Handles a failed login attempt, checking if the account should be locked.
 * @param {string} userId - The ID of the user whose login failed.
 * @param {string} ip - The IP address of the login attempt.
 */
async function handleFailedLogin(userId, ip) {
  const recentFailedLogins = await AuditLog.countDocuments({
    userId: userId,
    action: 'USER_LOGIN_FAILED',
    status: 'FAILURE',
    createdAt: { $gte: new Date(Date.now() - LOCKOUT_DURATION_MINUTES * 60 * 1000) }
  });

  if (recentFailedLogins + 1 >= FAILED_LOGIN_THRESHOLD) {
    const user = await User.findById(userId);
    if (user) {
      user.isLocked = true;
      user.lockExpiresAt = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
      await user.save();

      logEvent(userId, 'ACCOUNT_LOCKED', 'SUCCESS', { ipAddress: ip, details: { reason: 'Too many failed login attempts.' } });

      // Notify the user about the account lock
      await sendEmail({
        to: user.email,
        subject: 'Security Alert: Your Account Has Been Temporarily Locked',
        text: `Your account has been temporarily locked for ${LOCKOUT_DURATION_MINUTES} minutes due to multiple failed login attempts.`,
        html: `<p>Your account has been temporarily locked for <strong>${LOCKOUT_DURATION_MINUTES} minutes</strong> due to multiple failed login attempts.</p>`
      });
    }
  }
}

module.exports = {
  checkLoginAnomaly,
  handleFailedLogin,
}; 