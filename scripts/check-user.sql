-- Query to find user details by email
-- Run this in Supabase SQL Editor or via psql

-- User profile information
SELECT
  id,
  clerk_user_id,
  email,
  full_name,
  subscription_tier,
  subscription_status,
  created_at,
  updated_at,
  last_active_at
FROM user_profiles
WHERE email = 'abajnmota@gmail.com';

-- User's documents
SELECT
  id,
  title,
  file_type,
  file_size,
  processing_status,
  created_at
FROM documents
WHERE user_id = (SELECT id FROM user_profiles WHERE email = 'abajnmota@gmail.com')
ORDER BY created_at DESC;

-- User's flashcard sets
SELECT
  id,
  title,
  card_count,
  created_at
FROM flashcards
WHERE user_id = (SELECT id FROM user_profiles WHERE email = 'abajnmota@gmail.com')
ORDER BY created_at DESC;

-- User's study sessions
SELECT
  id,
  mode,
  duration_minutes,
  completed,
  created_at
FROM study_sessions
WHERE user_id = (SELECT id FROM user_profiles WHERE email = 'abajnmota@gmail.com')
ORDER BY created_at DESC
LIMIT 10;

-- User's activity from usage_tracking
SELECT
  action_type,
  COUNT(*) as count,
  MAX(created_at) as last_used
FROM usage_tracking
WHERE profile_id = (SELECT id FROM user_profiles WHERE email = 'abajnmota@gmail.com')
GROUP BY action_type
ORDER BY count DESC;
