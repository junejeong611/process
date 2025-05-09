#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="http://localhost:3001"

echo "🔍 Testing API Endpoints..."
echo "------------------------"

# Test Health Endpoint
echo -e "\n${GREEN}Testing Health Endpoint${NC}"
curl -v "${BASE_URL}/api/health"

# Test Auth Endpoints
echo -e "\n${GREEN}Testing Auth Endpoints${NC}"

# Register a new user
echo -e "\nTesting Register:"
curl -v -X POST "${BASE_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123","name":"Test User"}'

# Login
echo -e "\nTesting Login:"
TOKEN=$(curl -v -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}Failed to get token. Make sure the server is running and the user exists.${NC}"
  exit 1
fi

# Test Chat Endpoints
echo -e "\n${GREEN}Testing Chat Endpoints${NC}"

# Get Messages
echo -e "\nTesting Get Messages:"
curl -v -X GET "${BASE_URL}/api/chat/messages" \
  -H "Authorization: Bearer $TOKEN"

# Send Message
echo -e "\nTesting Send Message:"
curl -v -X POST "${BASE_URL}/api/chat/send" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello, how are you?"}'

# Test Voice Endpoint
echo -e "\n${GREEN}Testing Voice Endpoint${NC}"
echo -e "\nTesting Text-to-Speech:"
curl -v -X POST "${BASE_URL}/api/voice/tts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello, this is a test message."}' \
  --output test_audio.mp3

if [ -f "test_audio.mp3" ]; then
  echo -e "${GREEN}Audio file created successfully${NC}"
  rm test_audio.mp3
else
  echo -e "${RED}Failed to create audio file${NC}"
fi

echo -e "\n${GREEN}All tests completed!${NC}" 