# Direct MongoDB Connection Test

## Purpose
The `direct-test.js` file is a test script designed to verify a direct connection to a MongoDB Atlas cluster using Mongoose. It prints version information and attempts to connect to the database using a hardcoded connection string.

## Features
- **Version Information**: Prints the versions of Mongoose, MongoDB driver, and Node.js.
- **Direct Connection**: Attempts to connect to MongoDB Atlas using a direct connection string.
- **Error Handling**: Logs connection errors and provides additional error details if available.

## Usage

### Running the Test
To run the test, execute the script using Node.js. It will attempt to connect to the MongoDB Atlas cluster and print the connection status.

```bash
node test/direct-test.js
```

### Output
- **Version Information**: Displays the versions of Mongoose, MongoDB driver, and Node.js.
- **Connection Status**: Indicates whether the connection to MongoDB Atlas was successful or if an error occurred.

## Dependencies
- **mongoose**: Used for connecting to MongoDB.
- **mongodb**: MongoDB driver for Node.js.

## Limitations
- **Hardcoded Connection String**: The connection string is hardcoded in the script, which is not suitable for production use. Consider using environment variables for secure and flexible configuration. 