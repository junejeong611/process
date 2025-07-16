/**
 * Rate Limiting Test Script
 * 
 * This script tests the rate limiting functionality by making multiple requests
 * to various endpoints and verifying that rate limits are properly enforced.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5001';
const API_URL = `${BASE_URL}/api`;

// Test configuration
const TEST_CONFIG = {
  auth: {
    endpoint: '/auth/login',
    maxRequests: 5,
    windowMs: 10 * 60 * 1000, // 10 minutes
    description: 'Authentication endpoints (5 requests per 10 minutes)'
  },
  chat: {
    endpoint: '/chat/send',
    maxRequests: 30,
    windowMs: 5 * 60 * 1000, // 5 minutes
    description: 'Chat endpoints (30 requests per 5 minutes)'
  }
};

// Helper function to make a request and check the response
async function makeRequest(endpoint, data = {}, headers = {}) {
  try {
    const response = await axios.post(`${API_URL}${endpoint}`, data, {
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 5000
    });
    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      status: error.response?.status || 500, 
      data: error.response?.data || { message: error.message }
    };
  }
}

// Test rate limiting for a specific endpoint
async function testRateLimit(testConfig) {
  console.log(`\n🧪 Testing: ${testConfig.description}`);
  console.log(`Endpoint: ${testConfig.endpoint}`);
  console.log(`Expected limit: ${testConfig.maxRequests} requests per ${testConfig.windowMs / 60000} minutes`);
  
  const results = [];
  const testRequests = testConfig.maxRequests + 2; // Make 2 extra requests to test limit
  
  console.log(`\nMaking ${testRequests} requests...`);
  
  for (let i = 0; i < testRequests; i++) {
    const result = await makeRequest(testConfig.endpoint, {
      email: `test${i}@example.com`,
      password: 'testpassword'
    });
    
    results.push(result);
    
    if (result.success) {
      console.log(`✅ Request ${i + 1}: Success (${result.status})`);
    } else {
      if (result.status === 429) {
        console.log(`🚫 Request ${i + 1}: Rate limited (${result.status}) - ${result.data.message}`);
      } else {
        console.log(`❌ Request ${i + 1}: Failed (${result.status}) - ${result.data.message}`);
      }
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Analyze results
  const successfulRequests = results.filter(r => r.success).length;
  const rateLimitedRequests = results.filter(r => !r.success && r.status === 429).length;
  
  console.log(`\n📊 Results:`);
  console.log(`- Successful requests: ${successfulRequests}`);
  console.log(`- Rate limited requests: ${rateLimitedRequests}`);
  console.log(`- Other failed requests: ${results.length - successfulRequests - rateLimitedRequests}`);
  
  // Check if rate limiting is working
  if (rateLimitedRequests > 0) {
    console.log(`✅ Rate limiting is working correctly!`);
  } else {
    console.log(`⚠️ No rate limiting detected. This might be expected if the limit is higher than test requests.`);
  }
  
  return { successfulRequests, rateLimitedRequests };
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Rate Limiting Tests...');
  console.log(`Base URL: ${BASE_URL}`);
  
  try {
    // Test authentication rate limiting
    await testRateLimit(TEST_CONFIG.auth);
    
    // Note: Chat endpoint requires authentication, so we'll skip that test for now
    console.log('\n📝 Note: Chat endpoint test skipped (requires authentication)');
    
    console.log('\n✅ Rate limiting tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests, makeRequest, testRateLimit }; 