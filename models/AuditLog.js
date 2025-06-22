const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      'USER_LOGIN', 'USER_LOGIN_FAILED', 'USER_LOGOUT',
      'MFA_VERIFY_SUCCESS', 'MFA_VERIFY_FAILED',
      'CREATE_CONVERSATION', 'DELETE_CONVERSATION',
      'VIEW_CONVERSATION', 'SEND_MESSAGE',
      'PASSWORD_RESET_REQUEST', 'PASSWORD_RESET_SUCCESS',
      'MFA_RESET_REQUEST', 'MFA_RESET_SUCCESS',
      'DATA_EXPORT_REQUEST', 'DATA_EXPORT_SUCCESS',
      'ACCOUNT_DELETED',
      'FORCED_PASSWORD_RESET_INITIATED'
    ],
  },
  target: {
    targetId: mongoose.Schema.Types.ObjectId,
    targetType: String,
  },
  ipAddress: {
    type: String,
  },
  status: {
    type: String,
    required: true,
    enum: ['SUCCESS', 'FAILURE'],
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
  },
  deleteAfter: {
    type: Date,
    default: () => new Date(Date.now() + (parseInt(process.env.AUDIT_LOG_RETENTION_DAYS, 10) || 365) * 24 * 60 * 60 * 1000),
    index: { expires: '1s' }
  }
}, {
  timestamps: true,
  collection: 'audit_logs',
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog; 