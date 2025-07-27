#!/bin/bash

echo "Testing AISWelcome authentication flow..."

BASE_URL="http://localhost:8787"

# Test 1: Health check
echo -e "\n1. Testing health endpoint..."
curl -s "$BASE_URL/api/v1/health" | jq .

# Test 2: Register a new user
echo -e "\n2. Testing user registration..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/register" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser&password=testpassword123&email=test@example.com" \
  -D - \
  -o /dev/null)

echo "Register response headers:"
echo "$REGISTER_RESPONSE" | grep -E "(HTTP|Location|Set-Cookie)"

# Test 3: Login with the registered user
echo -e "\n3. Testing user login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser&password=testpassword123" \
  -D - \
  -o /dev/null)

SESSION_COOKIE=$(echo "$LOGIN_RESPONSE" | grep -oP 'aiswelcome_session=\K[^;]+')
echo "Session cookie: $SESSION_COOKIE"

# Test 4: Get stories with authentication
echo -e "\n4. Testing authenticated story retrieval..."
curl -s "$BASE_URL/api/v1/stories" \
  -H "Cookie: aiswelcome_session=$SESSION_COOKIE" | jq .

# Test 5: Submit a story
echo -e "\n5. Testing story submission..."
SUBMIT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/submit" \
  -H "Cookie: aiswelcome_session=$SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Story: AI Advances in 2025",
    "url": "https://example.com/ai-advances",
    "text": "This is a test story about AI advances."
  }')

echo "Submit response:"
echo "$SUBMIT_RESPONSE" | jq .

# Test 6: Vote on a story
echo -e "\n6. Testing story voting..."
VOTE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/vote/1" \
  -H "Cookie: aiswelcome_session=$SESSION_COOKIE")

echo "Vote response:"
echo "$VOTE_RESPONSE" | jq .

echo -e "\nAuthentication flow test complete!"