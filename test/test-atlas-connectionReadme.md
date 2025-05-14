# MongoDB Atlas Connection Test

## Purpose
The `test-atlas-connection.js` file is a test script designed to verify a connection to a MongoDB Atlas cluster using Mongoose. It uses environment variables for configuration and logs the connection status.

## Features
- **Environment-Based Configuration**: Uses a connection string from environment variables for secure configuration.
- **Connection Logging**: Logs the connection attempt and status to the console.
- **Error Handling**: Captures and logs any connection errors.

## Usage

### Running the Test
To run the test, execute the script using Node.js. It will attempt to connect to the MongoDB Atlas cluster and print the connection status.

```bash
node test/test-atlas-connection.js
```

### Output
- **Connection Attempt**: Logs the connection string (with credentials obscured) being used.
- **Connection Status**: Indicates whether the connection to MongoDB Atlas was successful or if an error occurred.

## Dependencies
- **dotenv**: Loads environment variables from a `.env` file.
- **mongoose**: Used for connecting to MongoDB.

## Environment Variables
Ensure the following environment variable is set in your `.env` file:
- `MONGODB_URI`: The connection string for MongoDB Atlas.

## Security Considerations
- **Environment Variables**: Use environment variables to keep sensitive information like connection strings secure and out of the source code. 