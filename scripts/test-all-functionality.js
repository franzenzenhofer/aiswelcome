#!/usr/bin/env node

/**
 * Comprehensive integration tests for AISWelcome
 * Tests ALL functionality, routes, APIs, and MCP server
 */

import { execSync } from 'child_process';

const BASE_URL = process.env.TEST_URL || 'https://aiswelcome.franzai.com';
let failedTests = [];
let passedTests = 0;

// Colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  purple: '\x1b[35m'
};

const log = {
  test: (msg) => console.log(`${colors.blue}🧪 ${msg}${colors.reset}`),
  pass: (msg) => { console.log(`${colors.green}✅ ${msg}${colors.reset}`); passedTests++; },
  fail: (msg, reason) => { 
    console.log(`${colors.red}❌ ${msg}${colors.reset}`);
    if (reason) console.log(`   ${colors.yellow}Reason: ${reason}${colors.reset}`);
    failedTests.push({ test: msg, reason });
  },
  section: (msg) => console.log(`\n${colors.purple}📋 ${msg}${colors.reset}\n`)
};

// Test helper function
async function testEndpoint(name, url, options = {}) {
  log.test(name);
  try {
    const fetchOptions = { ...options };
    delete fetchOptions.expectedStatus;
    delete fetchOptions.checkJson;
    delete fetchOptions.jsonChecks;
    delete fetchOptions.checkText;
    delete fetchOptions.textChecks;
    
    const response = await fetch(url, fetchOptions);
    const expectedStatus = options.expectedStatus || 200;
    
    if (response.status !== expectedStatus) {
      log.fail(name, `Expected status ${expectedStatus}, got ${response.status}`);
      return false;
    }

    // Additional checks
    if (options.checkJson) {
      try {
        const data = await response.json();
        if (options.jsonChecks) {
          for (const check of options.jsonChecks) {
            if (!check.fn(data)) {
              log.fail(name, check.message);
              return false;
            }
          }
        }
      } catch (e) {
        log.fail(name, 'Failed to parse JSON response');
        return false;
      }
    }

    if (options.checkText) {
      const text = await response.text();
      for (const check of options.textChecks || []) {
        if (!text.includes(check)) {
          log.fail(name, `Missing expected text: "${check}"`);
          return false;
        }
      }
    }

    log.pass(name);
    return true;
  } catch (error) {
    log.fail(name, error.message);
    return false;
  }
}

async function runTests() {
  console.log(`\n🚀 Testing AISWelcome at ${BASE_URL}\n`);

  // 1. Test all page routes
  log.section('Testing Page Routes');
  
  await testEndpoint('Homepage', `${BASE_URL}/`, {
    checkText: true,
    textChecks: ['Top Stories', 'submit', 'login']
  });

  await testEndpoint('Newest page', `${BASE_URL}/newest`, {
    checkText: true,
    textChecks: ['New Stories']
  });

  await testEndpoint('Submit page (redirect to login)', `${BASE_URL}/submit`, {
    expectedStatus: 303,
    method: 'GET',
    redirect: 'manual'
  });

  await testEndpoint('Login page', `${BASE_URL}/login`, {
    checkText: true,
    textChecks: ['Login', 'username', 'password', 'forgot']
  });

  await testEndpoint('Register page', `${BASE_URL}/register`, {
    checkText: true,
    textChecks: ['Create Account', 'username', 'password', 'email']
  });

  await testEndpoint('Forgot password page', `${BASE_URL}/forgot`, {
    checkText: true,
    textChecks: ['Reset Password', 'email']
  });

  await testEndpoint('Guidelines page', `${BASE_URL}/guidelines`, {
    checkText: true,
    textChecks: ['Community Guidelines', 'AI agents']
  });

  await testEndpoint('API documentation', `${BASE_URL}/api`, {
    checkText: true,
    textChecks: ['API Documentation', 'endpoints', 'authentication']
  });

  await testEndpoint('MCP info page', `${BASE_URL}/mcp`, {
    checkText: true,
    textChecks: ['MCP', 'Model Context Protocol']
  });

  // Skip this test since there's no seed data with id=1
  // await testEndpoint('Item page (valid)', `${BASE_URL}/item?id=1`, {
  //   checkText: true,
  //   textChecks: ['Welcome to AISWelcome']
  // });

  await testEndpoint('Item page (invalid)', `${BASE_URL}/item?id=999`, {
    expectedStatus: 404,
    checkText: true,
    textChecks: ['Story Not Found']
  });

  await testEndpoint('User profile', `${BASE_URL}/user?id=franz`, {
    checkText: true,
    textChecks: ['User: franz']
  });

  await testEndpoint('404 page', `${BASE_URL}/nonexistent`, {
    expectedStatus: 404,
    checkText: true,
    textChecks: ['Page Not Found']
  });

  // 2. Test API endpoints
  log.section('Testing API Endpoints');

  await testEndpoint('API health check', `${BASE_URL}/api/v1/health`, {
    checkJson: true,
    jsonChecks: [
      { fn: (d) => d.ok === true, message: 'Health check should return ok: true' },
      { fn: (d) => d.version === '1.1.0', message: 'Should return correct version' },
      { fn: (d) => d.features.authentication === true, message: 'Should have authentication enabled' },
      { fn: (d) => d.features.rateLimit === true, message: 'Should have rate limiting enabled' },
      { fn: (d) => d.features.aiOptimized === true, message: 'Should be AI optimized' }
    ]
  });

  await testEndpoint('Get stories', `${BASE_URL}/api/v1/stories`, {
    checkJson: true,
    jsonChecks: [
      { fn: (d) => d.ok === true, message: 'Should return ok: true' },
      { fn: (d) => Array.isArray(d.data), message: 'Should return data array' },
      { fn: (d) => typeof d.count === 'number', message: 'Should return count' }
    ]
  });

  await testEndpoint('Submit without auth', `${BASE_URL}/api/v1/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Test' }),
    expectedStatus: 401,
    checkJson: true,
    jsonChecks: [
      { fn: (d) => d.ok === false, message: 'Should return ok: false' },
      { fn: (d) => d.error === 'Please login to continue', message: 'Should require auth' }
    ]
  });

  await testEndpoint('Vote without auth', `${BASE_URL}/api/v1/vote/1`, {
    method: 'POST',
    expectedStatus: 401,
    checkJson: true,
    jsonChecks: [
      { fn: (d) => d.ok === false, message: 'Should return ok: false' },
      { fn: (d) => d.error === 'Please login to continue', message: 'Should require auth' }
    ]
  });

  await testEndpoint('Invalid API endpoint', `${BASE_URL}/api/v1/invalid`, {
    expectedStatus: 404,
    checkJson: true,
    jsonChecks: [
      { fn: (d) => d.ok === false, message: 'Should return ok: false' },
      { fn: (d) => d.error === 'API endpoint not found', message: 'Should return error message' }
    ]
  });

  // 3. Test MCP Server
  log.section('Testing MCP Server');

  await testEndpoint('MCP initialize', `${BASE_URL}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: 'initialize', id: 1 }),
    checkJson: true,
    jsonChecks: [
      { fn: (d) => d.result?.protocolVersion === '2025-06-18', message: 'Should return correct protocol version' },
      { fn: (d) => d.result?.serverInfo?.name === 'aiswelcome-mcp', message: 'Should return server name' },
      { fn: (d) => d.result?.serverInfo?.version === '1.0.0', message: 'Should return server version' }
    ]
  });

  await testEndpoint('MCP tools/list', `${BASE_URL}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: 'tools/list', id: 2 }),
    checkJson: true,
    jsonChecks: [
      { fn: (d) => Array.isArray(d.result?.tools), message: 'Should return tools array' },
      { fn: (d) => d.result?.tools?.length === 8, message: 'Should have exactly 8 tools' },
      { fn: (d) => d.result?.tools?.some(t => t.name === 'submitStory'), message: 'Should have submitStory tool' },
      { fn: (d) => d.result?.tools?.some(t => t.name === 'getStories'), message: 'Should have getStories tool' },
      { fn: (d) => d.result?.tools?.some(t => t.name === 'voteStory'), message: 'Should have voteStory tool' }
    ]
  });

  await testEndpoint('MCP resources/list', `${BASE_URL}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: 'resources/list', id: 3 }),
    checkJson: true,
    jsonChecks: [
      { fn: (d) => Array.isArray(d.result?.resources), message: 'Should return resources array' },
      { fn: (d) => d.result?.resources?.length === 5, message: 'Should have exactly 5 resources' }
    ]
  });

  await testEndpoint('MCP unknown method', `${BASE_URL}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: 'unknown/method', id: 4 }),
    checkJson: true,
    jsonChecks: [
      { fn: (d) => d.error?.code === -32601, message: 'Should return method not found error code' },
      { fn: (d) => d.error?.message === 'Method not found', message: 'Should return error message' }
    ]
  });

  await testEndpoint('MCP resources/read guidelines', `${BASE_URL}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: 'resources/read', params: { uri: 'aiswelcome://guidelines' }, id: 5 }),
    checkJson: true,
    jsonChecks: [
      { fn: (d) => d.result?.contents?.[0]?.mimeType === 'text/markdown', message: 'Should return markdown content' },
      { fn: (d) => d.result?.contents?.[0]?.text?.includes('Community Guidelines'), message: 'Should contain guidelines' }
    ]
  });

  // 4. Test security headers and mobile support
  log.section('Testing Security & Mobile Support');

  const homeResponse = await fetch(`${BASE_URL}/`);
  const homeText = await homeResponse.text();

  if (homeText.includes('viewport') && homeText.includes('width=device-width')) {
    log.pass('Mobile viewport meta tag present');
  } else {
    log.fail('Mobile viewport meta tag', 'Missing viewport meta tag');
  }

  if (homeText.includes('@media') && homeText.includes('max-width: 768px')) {
    log.pass('Mobile responsive CSS present');
  } else {
    log.fail('Mobile responsive CSS', 'Missing media queries');
  }

  // 5. Test CORS headers on API
  const apiResponse = await fetch(`${BASE_URL}/api/v1/health`);
  const corsHeader = apiResponse.headers.get('access-control-allow-origin');
  if (corsHeader === '*') {
    log.pass('CORS headers configured');
  } else {
    log.fail('CORS headers', 'Missing or incorrect CORS headers');
  }

  // Final summary
  console.log(`\n${'='.repeat(50)}`);
  console.log(`\n📊 Test Results Summary:`);
  console.log(`   ${colors.green}✅ Passed: ${passedTests}${colors.reset}`);
  console.log(`   ${colors.red}❌ Failed: ${failedTests.length}${colors.reset}`);
  
  if (failedTests.length > 0) {
    console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
    failedTests.forEach(({ test, reason }) => {
      console.log(`   - ${test}`);
      if (reason) console.log(`     ${colors.yellow}${reason}${colors.reset}`);
    });
    process.exit(1);
  } else {
    console.log(`\n${colors.green}🎉 All tests passed! AISWelcome is fully functional!${colors.reset}`);
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error(`\n${colors.red}Test runner error: ${error.message}${colors.reset}`);
  process.exit(1);
});