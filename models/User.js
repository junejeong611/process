// User Schema for Emotional Support App
// Includes validation, password hashing, and common static methods
// Example usage:
//   const user = await User.findByEmail('test@example.com');

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const mongooseEncryption = require('mongoose-encryption');
const SALT_WORK_FACTOR = 10;

const refreshTokenSchema = new mongoose.Schema({
  token: { type: String, required: true },
  device: String,
  lastUsed: Date,
  createdAt: { type: Date, default: Date.now, expires: '7d' } // Automatically remove after 7 days
});

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email address is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format']
  },
  password: {
    type: String,
    required: false,
    minlength: [8, 'Password must be at least 8 characters'],
    validate: {
      validator: function(v) {
        if (this.password == null && !this.isModified('password')) {
            return true;
        }
        return /\d/.test(v) && /[a-zA-Z]/.test(v);
      },
      message: 'Password must contain at least one letter and one number'
    }
  },
  passwordResetRequired: {
    type: Boolean,
    default: false
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  lastLogin: {
    type: Date
  },
  lastLoginIp: {
    type: String,
  },
  lastLoginCountry: {
    type: String,
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  lockExpiresAt: {
    type: Date
  },
  refreshTokens: [refreshTokenSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  resetPasswordToken: {
    type: String,
    select: false // Do not return by default for security
  },
  resetPasswordExpires: {
    type: Date
  },
  // Stripe & Subscription fields
  trialStart: {
    type: Date
  },
  trialEnd: {
    type: Date
  },
  subscriptionStatus: {
    type: String,
    enum: ['inactive', 'trialing', 'active', 'canceled', 'past_due'],
    default: 'inactive'
  },
  // MFA / 2FA Fields
  mfa_enabled: {
    type: Boolean,
    default: false
  },
  mfa_secret: {
    type: String,
    select: false // Do not return by default for security
  },
  mfa_setup_completed: {
    type: Boolean,
    default: false
  },
  backup_codes: {
    type: [String],
    select: false // Do not return by default
  },
  trusted_devices: {
    type: [{
      device_id: String,
      expires_at: Date
    }],
    select: false
  },
  last_mfa_attempt: {
    type: Date
  },
  mfa_attempt_count: {
    type: Number,
    default: 0
  },
  stripeCustomerId: {
    type: String
  },
  stripeSubscriptionId: {
    type: String
  },
  currentPlan: {
    type: String
  },
  currentPeriodStart: {
    type: Date
  },
  currentPeriodEnd: {
    type: Date
  },
  cancelAtPeriodEnd: {
    type: Boolean
  },
  // For password reset
  password_reset_token: String,
  password_reset_expires: Date,

  // For MFA reset
  mfa_reset_token: String,
  mfa_reset_expires: Date
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  collection: 'users',
  toJSON: { virtuals: true }, // Include virtuals when converting to JSON
  toObject: { virtuals: true } // Include virtuals when converting to object
});

// Virtual for full name (if firstName and lastName are used)
userSchema.virtual('fullName').get(function() {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.name; // Fallback to name field if first/last name not available
});

const encKey = process.env.ENCRYPTION_SECRET;
if (!encKey) {
  throw new Error('ENCRYPTION_SECRET environment variable is not set!');
}

userSchema.plugin(mongooseEncryption, {
  secret: encKey,
  encryptedFields: ['name', 'firstName', 'lastName'],
  authenticated: true,
  // Add blind indexes for searching on encrypted fields
  // This creates a new field __searchable_name, etc.
  // Note: Blind indexing is good for exact matches but not for substring searches.
  blindIndexes: ['name', 'firstName', 'lastName']
});

// Hash the refresh token before saving
refreshTokenSchema.pre('save', function(next) {
  if (this.isModified('token')) {
    this.token = crypto.createHash('sha256').update(this.token).digest('hex');
  }
  next();
});

// Pre-save hook to hash password if modified
userSchema.pre('save', async function(next) {
  // Hash password
  if (this.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (err) {
      return next(err);
    }
  }

  // Hashing of backup codes is now handled explicitly in the auth route
  // to prevent re-hashing.
  
  return next();
});

// Update lastLogin timestamp on successful login
userSchema.methods.updateLoginTimestamp = async function() {
  this.lastLogin = new Date();
  return this.save();
};

// Static method to find user by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email });
};

// Add a static method to log decrypted email and userId when finding by ID
userSchema.statics.findByIdWithDebug = async function(id) {
  const user = await this.findById(id);
  return user;
};

// Instance method to compare password (using async/await)
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to set a password reset token (hashes the token)
userSchema.methods.setPasswordResetToken = async function(rawToken) {
  const bcrypt = require('bcrypt');
  this.resetPasswordToken = await bcrypt.hash(rawToken, 10);
  this.resetPasswordExpires = Date.now() + 3600000; // 1 hour
};

// Instance method to clear the password reset token
userSchema.methods.clearPasswordResetToken = function() {
  this.resetPasswordToken = undefined;
  this.resetPasswordExpires = undefined;
};

// Create a model from the schema
const User = mongoose.model('User', userSchema);

module.exports = User;