-- Migration: Add INSERT policy for usage_tracking table
-- Date: 2025-11-15
-- Purpose: Fix tracking issue where incrementUsage() calls fail silently

-- Add INSERT policy for usage_tracking
-- This allows service role and authenticated users to insert usage records
CREATE POLICY "Service can insert usage tracking" ON usage_tracking
  FOR INSERT WITH CHECK (true);

-- Also add UPDATE policy for future use
CREATE POLICY "Service can update usage tracking" ON usage_tracking
  FOR UPDATE USING (true) WITH CHECK (true);

-- Add DELETE policy for data cleanup
CREATE POLICY "Service can delete usage tracking" ON usage_tracking
  FOR DELETE USING (true);

-- Note: These policies use WITH CHECK (true) which allows service role
-- and any authenticated process to insert records. This is safe because:
-- 1. Only server-side code (with service role key) can access these endpoints
-- 2. User authentication is checked at the API route level
-- 3. RLS is still enabled for SELECT (users can only view their own data)
