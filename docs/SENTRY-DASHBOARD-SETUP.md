# Sentry Dashboard & Alert Configuration Guide

**Project:** Synaptic.study
**Sentry Organization:** synaptic-a2
**Environment:** Production
**Last Updated:** 2025-11-18

---

## Prerequisites

- [x] Phase 1 monitoring infrastructure deployed (5 routes instrumented)
- [x] Sentry project configured: `synaptic-production`
- [x] Metrics being collected from production traffic
- [ ] Admin access to Sentry organization

## Overview

This guide configures Sentry dashboards and alerts using metrics already being collected by our monitoring infrastructure. **No code changes required** - this is pure configuration work.

### Metrics Currently Available

From our monitoring infrastructure (`lib/monitoring/`):

**API Metrics:**
- `api.duration` - Request latency in milliseconds
- `api.status_code` - HTTP status codes
- Route-specific counters (e.g., `documents.count`, `flashcards.ai_provider.openai`)

**Database Metrics:**
- `db.select.duration` - SELECT query duration
- `db.insert.duration` - INSERT query duration
- `db.update.duration` - UPDATE query duration
- `db.delete.duration` - DELETE query duration
- `db.query.duration` - Generic query duration
- `db.batch.duration` - Batch operation duration
- `db.rpc.duration` - RPC call duration

**Custom Metrics:**
- `flashcards.ai_generation.duration`
- `chat.ai_completion.duration`
- Various feature-specific counters

---

## Part 1: Database Performance Dashboard

### Step 1: Create New Dashboard

1. Navigate to [Sentry Dashboards](https://sentry.io/organizations/synaptic-a2/dashboards/)
2. Click **"Create Dashboard"** button (top right)
3. Enter dashboard details:
   - **Name:** `Database Performance - Production`
   - **Description:** `Real-time database query performance metrics`
4. Click **"Create"**

### Step 2: Add "Average Query Time" Widget

1. Click **"Add Widget"** button
2. Select **"Line Chart"** visualization
3. Configure the widget:

**Query Configuration:**
```
Metric: avg(db.select.duration)
Alias: SELECT Queries

Add another query:
Metric: avg(db.insert.duration)
Alias: INSERT Queries

Add another query:
Metric: avg(db.update.duration)
Alias: UPDATE Queries
```

**Display Options:**
- Title: `Average Query Time by Operation`
- Y-Axis: `Duration (ms)`
- Time Window: `Last 24 hours`
- Group By: `db.operation`

4. Click **"Add Widget"**

### Step 3: Add "Slow Queries" Widget

1. Click **"Add Widget"**
2. Select **"Table"** visualization
3. Configure:

**Query:**
```
Event Type: Transactions
Filter: db.query.duration > 500
```

**Columns to Display:**
- Transaction Name
- `db.table` (custom tag)
- `db.operation` (custom tag)
- Duration (p95)
- Count

**Sorting:**
- Sort by: Duration (Descending)
- Limit: 20 results

**Display:**
- Title: `Slowest Database Queries (>500ms)`

4. Click **"Add Widget"**

### Step 4: Add "Queries by Table" Widget

1. Click **"Add Widget"**
2. Select **"Bar Chart"** visualization
3. Configure:

**Query:**
```
Metric: count()
Group By: db.table
Filter: db.operation:*
```

**Display:**
- Title: `Query Volume by Table`
- X-Axis: Table Name
- Y-Axis: Query Count
- Time Window: Last 24 hours

4. Click **"Add Widget"**

### Step 5: Add "Database Errors" Widget

1. Click **"Add Widget"**
2. Select **"Big Number"** visualization
3. Configure:

**Query:**
```
Metric: count()
Filter: database.error:true
```

**Display:**
- Title: `Database Errors (24h)`
- Show Trend: Enabled
- Comparison: Previous period

4. Click **"Add Widget"**

### Step 6: Save Dashboard

1. Click **"Save"** in top right
2. Set as **Default Dashboard** (optional)
3. Copy dashboard URL for team access

---

## Part 2: Feature Usage Dashboard

### Step 1: Create Dashboard

1. Navigate to Dashboards → **Create Dashboard**
2. Dashboard details:
   - **Name:** `Feature Usage - Production`
   - **Description:** `User activity and feature adoption metrics`
3. Click **"Create"**

### Step 2: Add "API Endpoints" Widget

1. **Add Widget** → **Bar Chart**
2. Configure:

**Query:**
```
Metric: count()
Filter: transaction.op:http.server
Group By: transaction
```

**Display:**
- Title: `Most Used API Endpoints`
- Sort: Count (Descending)
- Limit: 15 endpoints
- Time Window: Last 7 days

3. **Add Widget**

### Step 3: Add "Response Time Distribution" Widget

1. **Add Widget** → **Line Chart**
2. Configure:

**Queries:**
```
Query 1:
Metric: percentile(api.duration, 0.5)
Alias: p50 (Median)

Query 2:
Metric: percentile(api.duration, 0.95)
Alias: p95

Query 3:
Metric: percentile(api.duration, 0.99)
Alias: p99
```

**Display:**
- Title: `API Response Time Percentiles`
- Y-Axis: Duration (ms)
- Show Legend: Enabled
- Time Window: Last 24 hours

3. **Add Widget**

### Step 4: Add "Active Users" Widget

1. **Add Widget** → **Big Number**
2. Configure:

**Query:**
```
Metric: count_unique(user)
Filter: (none)
```

**Display:**
- Title: `Active Users (24h)`
- Show Trend: Enabled
- Comparison: Previous day

3. **Add Widget**

### Step 5: Add "Feature Adoption" Widget

1. **Add Widget** → **Bar Chart**
2. Configure:

**Query:**
```
Metric: count()
Group By: Custom tag (feature_type)
Filter: transaction:/api/generate-*
```

**Display:**
- Title: `Content Generation Activity`
- Categories: Flashcards, Podcasts, Mind Maps, Exams
- Time Window: Last 7 days

3. **Add Widget**

### Step 6: Save Dashboard

Click **"Save"** in top right

---

## Part 3: AI Provider Comparison Dashboard

### Step 1: Create Dashboard

1. **Create Dashboard**
2. Details:
   - **Name:** `AI Provider Performance`
   - **Description:** `Compare OpenAI, DeepSeek, and Anthropic performance`

### Step 2: Add "Latency Comparison" Widget

1. **Add Widget** → **Line Chart**
2. Configure:

**Queries:**
```
Query 1:
Metric: avg(measurement)
Filter: measurement.name:flashcards.ai_generation.duration AND ai.provider:openai
Alias: OpenAI

Query 2:
Metric: avg(measurement)
Filter: measurement.name:flashcards.ai_generation.duration AND ai.provider:deepseek
Alias: DeepSeek

Query 3:
Metric: avg(measurement)
Filter: measurement.name:chat.ai_completion.duration AND ai.provider:anthropic
Alias: Anthropic
```

**Display:**
- Title: `Average AI Response Time by Provider`
- Y-Axis: Duration (ms)
- Time Window: Last 7 days

3. **Add Widget**

### Step 3: Add "Error Rate by Provider" Widget

1. **Add Widget** → **Bar Chart**
2. Configure:

**Query:**
```
Metric: failure_rate()
Group By: ai.provider
Filter: transaction:/api/generate-* OR transaction:/api/chat-*
```

**Display:**
- Title: `AI Provider Error Rates`
- Y-Axis: Error Rate (%)
- Time Window: Last 24 hours

3. **Add Widget**

### Step 4: Save Dashboard

Click **"Save"**

---

## Part 4: Alert Rules Configuration

### Alert 1: High Error Rate

**Navigate to:** Sentry → Alerts → Create Alert

1. **Select Alert Type:** Metric Alert
2. **Configure Conditions:**

```
Alert Name: High Error Rate - Production

Environment: production

Metric: failure_rate()
Time Window: 10 minutes
Threshold: > 5%
Filter: (all transactions)
```

3. **Actions:**
   - Send email to: [Your email]
   - Slack notification (optional): #engineering-alerts
   - Create Sentry issue: Enabled

4. **Save Alert**

### Alert 2: Database Performance Degradation

1. **Create Alert** → **Metric Alert**
2. **Configure:**

```
Alert Name: Database Slowdown - Production

Environment: production

Metric: percentile(db.query.duration, 0.95)
Time Window: 5 minutes
Threshold: > 1000 ms
Filter: db.operation:SELECT
```

3. **Actions:**
   - Email notification
   - High priority
   - Create issue

4. **Save Alert**

### Alert 3: API Latency Spike

1. **Create Alert** → **Metric Alert**
2. **Configure:**

```
Alert Name: API Performance Degradation

Environment: production

Metric: percentile(api.duration, 0.95)
Time Window: 5 minutes
Threshold: > 3000 ms
Filter: transaction.op:http.server
```

3. **Actions:**
   - Email notification
   - Create issue with "performance" tag

4. **Save Alert**

### Alert 4: Storage Upload Failures

1. **Create Alert** → **Metric Alert**
2. **Configure:**

```
Alert Name: Storage Upload Failures

Environment: production

Metric: count()
Time Window: 5 minutes
Threshold: > 5
Filter: storage.upload_failed:true
```

3. **Actions:**
   - Immediate email notification
   - High priority

4. **Save Alert**

---

## Part 5: Daily Digest Configuration

### Step 1: Enable Project Summary

1. Navigate to **Settings** → **Projects** → **synaptic-production**
2. Go to **Notifications** tab
3. Enable **"Weekly Reports"**
4. Configure:
   - Recipients: Team emails
   - Include: Error trends, Performance metrics, User impact
   - Day: Monday mornings

### Step 2: Personal Digest Settings

1. Click your profile → **User Settings**
2. Go to **Notifications**
3. Enable:
   - **Daily Summary** (if available)
   - **Performance Digest**
   - **Issue Digest**

---

## Part 6: Verification Checklist

After completing setup, verify each component:

### Dashboards
- [ ] Database Performance dashboard shows real data
- [ ] At least 3 widgets have data points
- [ ] Slow queries table is populated (if any slow queries exist)
- [ ] Feature Usage dashboard shows API activity
- [ ] Active users counter is working
- [ ] AI Provider dashboard shows metrics (once AI features are used)

### Alerts
- [ ] All 4 alert rules created
- [ ] Email notifications configured
- [ ] Test alert by triggering condition (optional)
- [ ] Verify alert fires correctly

### Access
- [ ] Dashboard URLs bookmarked
- [ ] Team members have access
- [ ] Mobile notifications configured (optional)

---

## Troubleshooting

### No Data in Dashboards

**Symptom:** Widgets show "No data found"

**Solutions:**
1. Check time window - try "Last 7 days" instead of "Last 24 hours"
2. Verify environment filter is set to "production"
3. Check that traffic is flowing to production
4. Verify metrics are being sent: Go to **Performance** → **Metrics** to see all available metrics

### Alerts Not Firing

**Symptom:** Expected alerts don't trigger

**Solutions:**
1. Check alert history: Alerts → View alert → History tab
2. Verify threshold is appropriate (lower for testing)
3. Check environment filter matches production traffic
4. Verify email notification settings in user profile

### Missing Metrics

**Symptom:** Expected metric not available in dropdown

**Solutions:**
1. Verify metric name exactly matches what's sent from code:
   - Check `lib/monitoring/api-monitor.ts` for API metrics
   - Check `lib/monitoring/supabase-monitor.ts` for DB metrics
2. Ensure production traffic has occurred since deployment
3. Metrics may take 5-10 minutes to appear after first use

---

## Useful Links

- **Main Dashboard:** https://sentry.io/organizations/synaptic-a2/dashboards/
- **Metrics Explorer:** https://sentry.io/organizations/synaptic-a2/metrics/
- **Performance:** https://sentry.io/organizations/synaptic-a2/performance/
- **Alerts:** https://sentry.io/organizations/synaptic-a2/alerts/

---

## Next Steps (Optional Enhancements)

After basic dashboards are working:

1. **Add Cost Tracking Dashboard**
   - Track AI provider costs
   - Monitor storage usage
   - Database connection pool metrics

2. **Create User Journey Dashboard**
   - Track user flow through features
   - Conversion metrics
   - Feature drop-off points

3. **Add Custom Metrics**
   - Business KPIs (documents processed, flashcards created)
   - User engagement scores
   - Feature adoption rates

4. **Advanced Alerts**
   - Anomaly detection (unusual traffic patterns)
   - SLA breach alerts (response time > target)
   - Cost threshold alerts

---

## Support

If you encounter issues with Sentry configuration:

1. Check [Sentry Documentation](https://docs.sentry.io/product/dashboards/)
2. Review Phase 1 monitoring code for available metrics
3. Contact Sentry support (if needed)

**Configuration completed by:** [Your Name]
**Date:** [Today's Date]
**Version:** Phase 3 - Initial Setup
