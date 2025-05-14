# Conversation Model (models.Conversation.js)

## Purpose
This file defines the Conversation schema and model for MongoDB using Mongoose. It handles all database operations related conversation data between the user and the Claude ai. It includes fields for user reference, title, timestamps, and activity status, along with methods for querying and managing conversations.

## Dependencies
- **Mongoose**: library to interact with MongoDB.Used to define the schema and create

mongoose: The library used for interacting with MongoDB. It is required to define the schema and create the model.

## Schema Definition

### User Schema Fields
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `username` | String | Yes | - | Unique username for the user |
| `email` | String | Yes | - | User's email address (unique) |
| `password` | String | Yes | - | Hashed password |
| `firstName` | String | No | `null` | User's first name |
| `lastName` | String | No | `null` | User's last name |
| `role` | String | No | `"user"` | User role (user, admin, etc.) |
| `createdAt` | Date | No | `Date.now` | Timestamp of account creation |
| `updatedAt` | Date | No | `Date.now` | Timestamp of last update |

### Indexes
- `username`: Unique index
- `email`: Unique index

## Methods

### Instance Methods
- `comparePassword(password)`: Compares provided password with stored hash
- `generateAuthToken()`: Creates authentication token for the user

### Static Methods
- `findByCredentials(email, password)`: Finds user by email and validates password

## Middleware
- `pre('save')`: Hashes password before saving
- `pre('findOneAndUpdate')`: Updates the `updatedAt` timestamp

## Usage Examples
```javascript
// Creating a new user
const newUser = new User({
  username: 'johndoe',
  email: 'john@example.com',
  password: 'securepassword',
  firstName: 'John',
  lastName: 'Doe'
});
await newUser.save();

// Finding a user by ID
const user = await User.findById('60d21b4667d0d8992e610c85');

// Authentication
const user = await User.findByCredentials('john@example.com', 'password');
const token = await user.generateAuthToken();