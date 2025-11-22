-- Migration: Add Stripe webhook deduplication table
-- Purpose: Prevent duplicate processing of webhook events (replay attacks, retries)
-- Created: 2025-11-21

-- ============================================================================
-- WEBHOOK EVENTS TABLE
-- ============================================================================
-- Tracks processed Stripe webhook events to ensure idempotency
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_event_id TEXT UNIQUE NOT NULL, -- Stripe event.id (e.g., evt_1234567890)
  event_type TEXT NOT NULL, -- Event type (e.g., 'checkout.session.completed')
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  event_data JSONB, -- Optional: Store full event for debugging
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by stripe_event_id (primary deduplication check)
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_event_id
  ON webhook_events(stripe_event_id);

-- Index for cleanup queries (find old events to delete)
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at
  ON webhook_events(created_at DESC);

-- Index for analytics/debugging by event type
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type
  ON webhook_events(event_type);

-- Comment for documentation
COMMENT ON TABLE webhook_events IS 'Tracks processed Stripe webhook events to prevent duplicate processing and replay attacks';
COMMENT ON COLUMN webhook_events.stripe_event_id IS 'Unique Stripe event identifier used for deduplication';
COMMENT ON COLUMN webhook_events.event_type IS 'Stripe event type (e.g., checkout.session.completed, customer.subscription.updated)';
COMMENT ON COLUMN webhook_events.event_data IS 'Optional full event JSON for debugging - can be null to save space';
