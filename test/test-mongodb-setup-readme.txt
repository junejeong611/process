test-mongodb-setup
Purpose of the test-mongodb-setup file: 
    This script serves as a simple diagnostic tool to
    Verify Database Connectivity: Confirm that your application can successfully connect to MongoDB
    Test Basic CRUD Operations: Ensure Create, Read, and Delete operations work correctly
    Validate Environment Configuration: Check that database connection strings and environment variables are correctly set up
    Verify User Model Integration: Confirm the User model is properly connected to the database
    Diagnose Setup Issues: Provide a quick way to diagnose issues when setting up a new environment

How it works:
    Database Connection: Attempts to connect to MongoDB using the connection string from environment variables
    Basic CRUD Testing: Performs a simple cycle of creating, retrieving, and deleting a test user
    Sequential Operation: Runs tests in logical order with clear console reporting for each step
    Cleanup: Removes test data after completion, even if tests fail
    Error Handling: Reports specific errors and exits with appropriate status codes

Test Sequence:
    Connect to MongoDB: Verifies the connection string is valid and the database is accessible
    Create Test User: Creates a temporary user with a unique timestamp-based email
    Retrieve Test User: Confirms the user can be found using the findByEmail method
    Delete Test User: Removes the test user and verifies it was successfully deleted

Example Usage:
    # Run the test script
    node test/test-mongodb-setup.js
    # Example output
    --- MongoDB Setup Test ---
    1. Connected to MongoDB
    2. Test user created: testuser_1620847329456@example.com
    3. Test user retrieved successfully
    4. Test user deleted successfully
    --- All steps completed successfully! ---

Dependencies:
mongoose, dotenv, models/User

Environment/config requirements:
    MONGODB_URI: MongoDB connection string
    Default: 'mongodb://localhost:27017/emotionalsupportapp' if not provided in environment

Test Data:
    Email: Generated with timestamp to ensure uniqueness (testuser_[timestamp]@example.com)
    Password: "Test1234"
    Name: "Test User"
    FirstName: "Test"
    LastName: "User"

Exit Codes:
    0: All tests passed successfully
    1: One or more tests failed

When to Run:
    When setting up a new development or production environment
    After changing database configuration or connection strings
    When troubleshooting database connectivity issues
    Before running the application or more comprehensive tests
    As part of deployment verification