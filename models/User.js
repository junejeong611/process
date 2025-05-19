// User Schema for Emotional Support App
// Includes validation, password hashing, and common static methods
// Example usage:
//   const user = await User.findByEmail('test@example.com');

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const SALT_WORK_FACTOR = 10;

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
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    validate: {
      validator: function(v) {
        // Password must contain at least one number and one letter
        return /\d/.test(v) && /[a-zA-Z]/.test(v);
      },
      message: 'Password must contain at least one letter and one number'
    }
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
  refreshToken: {
    type: String
  },
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
  }
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

// Pre-save hook to hash password if modified
userSchema.pre('save', async function(next) {
  try {
    if (!this.isModified('password')) return next();
    
    const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
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