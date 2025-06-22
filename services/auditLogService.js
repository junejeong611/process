const AuditLog = require('../models/AuditLog');

/**
 * Logs an audit event to the database.
 * This is designed to be an async operation that does not block the request-response cycle.
 * 
 * @param {string} userId - The ID of the user performing the action.
 * @param {string} action - The type of action being performed (e.g., 'USER_LOGIN').
 * @param {string} status - The status of the action ('SUCCESS' or 'FAILURE').
 * @param {object} options - Additional optional parameters.
 * @param {string} [options.ipAddress] - The IP address of the user.
 * @param {string} [options.targetId] - The ID of the resource being acted upon.
 * @param {string} [options.targetType] - The type of the resource (e.g., 'Conversation').
 * @param {object} [options.details] - Any additional details to log.
 */
const logEvent = (userId, action, status, options = {}) => {
  // Fire-and-forget: we don't await this promise, so it doesn't block the main thread.
  // Error handling is done inside the promise to prevent unhandled promise rejections.
  new Promise(resolve => {
    const { ipAddress, targetId, targetType, details } = options;
    
    const auditEntry = new AuditLog({
      userId,
      action,
      status,
      ipAddress,
      target: {
        targetId,
        targetType,
      },
      details,
    });

    auditEntry.save()
      .then(() => resolve())
      .catch(err => {
        console.error('Failed to save audit log:', err);
        resolve(); // Resolve anyway to not leave promise hanging
      });
  });
};

module.exports = {
  logEvent,
}; 