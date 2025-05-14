test-user-schema
Purpose of the test-user-schema file:
    Validate User Schema: Ensure the MongoDB schema for users works correctly
    Test Data Validation: Verify that validation rules are enforced properly
    Test Security Features: Confirm that password hashing functions as expected
    Test Custom Methods: Check that the custom methods on the User model work
    Test Database Operations: Ensure CRUD (Create, Read, Update, Delete) operations work with the User model
    Detect Regression: Identify any issues if changes to the User model break functionality

How it works:
    Database Connection: Connects to MongoDB using the connection string from environment variables
    Sequential Testing: Runs a series of tests in order, with each test building on the previous ones
    Data Creation: Creates a temporary test user with a unique timestamp-based email
    Validation Testing: Verifies that schema validation rules properly reject invalid data
    Method Testing: Checks that both instance and static methods work correctly
    Cleanup: Removes the test user after testing to avoid database pollution
    Error Reporting: Provides clear console output for both passing and failing tests

Test Sequence:
    Database Connection: Verifies connection to MongoDB
    User Creation: Creates a test user with valid data
    Password Hashing: Confirms passwords are not stored in plain text
    Password Comparison: Tests the comparePassword instance method
    Email Lookup: Verifies the findByEmail static method
    Virtual Properties: Checks that the fullName virtual property works
    Login Timestamp: Tests the updateLoginTimestamp method
    Duplicate Detection: Verifies unique email constraint works
    Validation Rules: Confirms email format validation is enforced
    User Deletion: Tests user removal from database

Example Usage:
# Run the test script
node test/test-user-schema.js

# Example output
--- User Schema & DB Utility Test ---
Connected to MongoDB
User created: testuser_1620847329456@example.com
Password hashing: OK
comparePassword: OK
findByEmail: OK
fullName virtual: OK
updateLoginTimestamp: OK
Duplicate email error: OK
Validation error (invalid email): OK
User deletion: OK
--- All User schema/database utility tests passed! ---
Disconnected from MongoDB
Dependencies:

mongoose: MongoDB object modeling tool
dotenv: Environment variable loading
../models/User: The User model being tested

Environment/config requirements:

MONGODB_URI: MongoDB connection string (defaults to 'mongodb://localhost:27017/emotionalsupportapp' if not provided)

Test Data:
    Email: Generated with timestamp to ensure uniqueness (testuser_[timestamp]@example.com)
    Password: "Test1234" (meets password requirements)
    Name: "Test User"
    FirstName: "Test"
    LastName: "User"

Exit Codes:
    0: All tests passed successfully
    1: One or more tests failed

Error Handling:
    The script attempts to clean up test data even if tests fail
    Each test has specific error messages for debugging
    The MongoDB connection is properly closed in the finally block

When to Run:
    After making changes to the User model or schema
    When setting up a new development environment
    As part of CI/CD pipeline testing
    Before deploying changes to production