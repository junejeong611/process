# API Endpoints Test Script

## Purpose
The `test_endpoints.sh` file is a shell script designed to test various API endpoints of the application. It verifies the functionality of health, authentication, chat, and voice endpoints by sending HTTP requests and checking the responses.

## Features
- **Health Check**: Tests the health endpoint to ensure the server is running.
- **Authentication**: Tests user registration and login endpoints, extracting and using the authentication token for further requests.
- **Chat Functionality**: Tests chat-related endpoints, including sending and retrieving messages.
- **Voice Synthesis**: Tests the text-to-speech endpoint, verifying audio file creation.

## Usage

### Running the Test
To run the test, execute the script using bash. Ensure the server is running and accessible at the specified base URL.

```bash
bash test/test_endpoints.sh
```

### Output
- **Health Check**: Confirms the server's health status.
- **Authentication**: Displays the token and user ID upon successful login.
- **Chat and Voice Tests**: Outputs the response and status for each endpoint tested, including audio file creation status.

## Dependencies
- **curl**: Used for making HTTP requests to the API endpoints.

## Configuration
- **Base URL**: The script uses `http://localhost:5001` as the default base URL. Modify this if your server is running on a different host or port.

## Limitations
- **Hardcoded Credentials**: The script uses hardcoded credentials for testing. Update these as needed for different test scenarios.
- **Local Environment**: Designed for testing in a local development environment. Ensure the server is running locally before executing the script.
