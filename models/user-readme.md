User.js
Purpose of the file/module:
Instead, it provides the schema, validation, and helper methods for user data, which can be used by your application's API routes or controllers
This file defines the MongoDB user schema and model for the Emotional Support App
It handles user account data structure, validation, security (password hashing), and provides methods for user authentication and account management
This model serves as the foundation for all user-related operations throughout the application

How it works:
    Schema Definition: Creates a MongoDB schema with fields for email, password, name, login tracking, and account status
    Data Validation: Enforces validation rules (proper email format, strong password requirements)
    Password Security: Automatically hashes passwords using bcrypt before saving them to the database
    Virtual Properties: Provides a computed fullName property that combines firstName and lastName fields
    User Authentication: Includes methods to securely compare passwords and manage login sessions
    Database Integration: Defines the structure for how user data is stored in MongoDB with proper indexing

How to use (methods, example usage):
Instance Methods
updateLoginTimestamp() - Updates the lastLogin field with current date/time
comparePassword(password) - Securely verifies if a provided password matches the stored hash

Static Methods:
findByEmail(email) - Finds a user by their email address

Example Usage:
```
// Create a new user
const newUser = new User({
  email: 'user@example.com',
  password: 'securePass123',
  name: 'John Doe',
  firstName: 'John',
  lastName: 'Doe'
});
await newUser.save();

// Find user by email
const user = await User.findByEmail('user@example.com');

// Verify password during login
if (await user.comparePassword('attemptedPassword')) {
  // Password matches
  await user.updateLoginTimestamp();
  // Generate and return JWT token
} else {
  // Password incorrect
}

// Access virtual property
console.log(user.fullName); // "John Doe"
```

Dependencies:
    mongoose, bcrypt

Schema Fields:
    email (String): Required, unique, validated email address
    password (String): Required, min 8 chars, must contain letters and numbers
    name (String): Required user's name
    firstName (String): Optional first name
    lastName (String): Optional last name
    lastLogin (Date): Timestamp of most recent login
    refreshToken (String): For authentication token refresh
    isActive (Boolean): Account status flag, defaults to true
    createdAt/updatedAt: Automatic timestamps

Security Features:
    Passwords are automatically hashed using bcrypt with a salt factor of 10
    Password validation ensures minimum security requirements
    Email uniqueness prevents duplicate accounts