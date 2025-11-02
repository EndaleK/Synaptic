-- Migration: Add missing columns to existing tables
-- Created: 2025-11-02
-- Purpose: Fix column mismatch errors

-- ============================================================================
-- Add missing column to user_profiles
-- ============================================================================
-- Add monthly_document_count if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'monthly_document_count'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN monthly_document_count INTEGER DEFAULT 0;

    RAISE NOTICE 'Added monthly_document_count column to user_profiles';
  ELSE
    RAISE NOTICE 'Column monthly_document_count already exists in user_profiles';
  END IF;
END $$;

-- ============================================================================
-- Fix learning_profiles foreign key
-- ============================================================================
-- The error shows learning_profiles.user_id doesn't exist
-- This suggests the table might reference clerk_user_id instead of user_profiles.id

-- First, check if the column exists
DO $$
DECLARE
  user_profiles_id_type TEXT;
BEGIN
  -- Detect the data type of user_profiles.id
  SELECT data_type INTO user_profiles_id_type
  FROM information_schema.columns
  WHERE table_name = 'user_profiles'
  AND column_name = 'id';

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'learning_profiles'
    AND column_name = 'user_id'
  ) THEN
    -- Add user_id with the correct type matching user_profiles.id
    IF user_profiles_id_type = 'bigint' THEN
      ALTER TABLE learning_profiles
      ADD COLUMN user_id BIGINT REFERENCES user_profiles(id) ON DELETE CASCADE;

      RAISE NOTICE 'Added user_id column (BIGINT) to learning_profiles';
    ELSIF user_profiles_id_type = 'uuid' THEN
      ALTER TABLE learning_profiles
      ADD COLUMN user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE;

      RAISE NOTICE 'Added user_id column (UUID) to learning_profiles';
    ELSE
      RAISE EXCEPTION 'Unexpected user_profiles.id type: %', user_profiles_id_type;
    END IF;
  ELSE
    RAISE NOTICE 'Column user_id already exists in learning_profiles';
  END IF;

  -- If clerk_user_id exists instead, we might need to migrate data
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'learning_profiles'
    AND column_name = 'clerk_user_id'
  ) THEN
    RAISE NOTICE 'Warning: learning_profiles has clerk_user_id column - manual data migration may be needed';
  END IF;
END $$;

-- ============================================================================
-- Add teaching_style columns to learning_profiles if missing
-- ============================================================================
DO $$
BEGIN
  -- Add teaching_style_preference
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'learning_profiles'
    AND column_name = 'teaching_style_preference'
  ) THEN
    ALTER TABLE learning_profiles
    ADD COLUMN teaching_style_preference TEXT;

    RAISE NOTICE 'Added teaching_style_preference to learning_profiles';
  END IF;

  -- Add socratic_percentage
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'learning_profiles'
    AND column_name = 'socratic_percentage'
  ) THEN
    ALTER TABLE learning_profiles
    ADD COLUMN socratic_percentage INTEGER;

    RAISE NOTICE 'Added socratic_percentage to learning_profiles';
  END IF;

  -- Add teaching_style_scores
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'learning_profiles'
    AND column_name = 'teaching_style_scores'
  ) THEN
    ALTER TABLE learning_profiles
    ADD COLUMN teaching_style_scores JSONB;

    RAISE NOTICE 'Added teaching_style_scores to learning_profiles';
  END IF;
END $$;

-- ============================================================================
-- Verify critical columns exist
-- ============================================================================
DO $$
DECLARE
  missing_columns TEXT := '';
BEGIN
  -- Check user_profiles.monthly_document_count
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'monthly_document_count'
  ) THEN
    missing_columns := missing_columns || 'user_profiles.monthly_document_count, ';
  END IF;

  -- Check learning_profiles.user_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'learning_profiles'
    AND column_name = 'user_id'
  ) THEN
    missing_columns := missing_columns || 'learning_profiles.user_id, ';
  END IF;

  IF missing_columns != '' THEN
    RAISE EXCEPTION 'Still missing columns: %', TRIM(TRAILING ', ' FROM missing_columns);
  ELSE
    RAISE NOTICE 'All required columns verified!';
  END IF;
END $$;
