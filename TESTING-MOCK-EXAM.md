# Mock Exam Feature - End-to-End Testing Guide

## Test Environment
- **Local Dev Server**: http://localhost:3003
- **Test Date**: November 9, 2025
- **Tester**: Claude Code (Automated Testing)

---

## Test Plan Overview

### Feature Components to Test:
1. **Exam Creation Flow**
   - Document selection
   - Exam configuration (title, difficulty, question count, time limit)
   - Exam generation via AI
   - Error handling

2. **Exam Taking Experience**
   - Exam interface loading
   - Timer functionality
   - Question navigation
   - Answer recording
   - Auto-save functionality
   - Exam submission

3. **Exam Review**
   - View completed exam results
   - See correct/incorrect answers
   - Review explanations
   - Retake option

4. **Analytics Dashboard**
   - Performance metrics
   - Question-level analytics
   - Progress tracking

---

## Test Cases

### TC-001: Navigate to Mock Exam Feature
**Steps:**
1. Open http://localhost:3003
2. Sign in to dashboard
3. Navigate to Mock Exams section

**Expected Result:**
- Mock Exam view loads successfully
- "Create New Exam" button visible
- Empty state message shows if no exams exist

**Status**: ⏳ Pending

---

### TC-002: Create New Exam from Document
**Prerequisites:**
- At least one document uploaded in the system

**Steps:**
1. Click "Create New Exam" button
2. Select a document from the modal
3. Configure exam settings:
   - Title: "Test Exam 1"
   - Description: "End-to-end test exam"
   - Question count: 5
   - Difficulty: Mixed
   - Time limit: 10 minutes
   - Enable explanations: Yes
4. Click "Generate Exam"

**Expected Result:**
- Exam generation starts (loading indicator)
- Success message appears after generation
- New exam appears in exam list
- Exam card shows: title, difficulty badge, question count, time limit

**Status**: ⏳ Pending

---

### TC-003: Start Timed Exam
**Prerequisites:**
- Exam exists in the system

**Steps:**
1. Click "Start Exam" button on exam card
2. Observe exam interface loads

**Expected Result:**
- Exam interface displays correctly
- Timer starts countdown from time limit
- First question displays
- Question navigator shows all questions
- Progress bar initializes at 0%

**Status**: ⏳ Pending

---

### TC-004: Answer Questions
**Steps:**
1. Answer first question (select MCQ option or type answer)
2. Observe question marked as "answered" in navigator
3. Click "Next" to move to next question
4. Click "Previous" to go back
5. Verify previous answer is retained

**Expected Result:**
- Answers are recorded immediately
- Question navigator updates to show answered state (green)
- Current question highlighted in navigator (blue)
- Previous/Next navigation works correctly
- Answers persist when navigating between questions

**Status**: ⏳ Pending

---

### TC-005: Test Auto-Save Functionality
**Steps:**
1. Answer 2-3 questions
2. Wait 30+ seconds (auto-save interval)
3. Check browser console for auto-save API calls

**Expected Result:**
- Auto-save API call occurs every 30 seconds
- No error messages in console
- Answers are saved to server

**Status**: ⏳ Pending

---

### TC-006: Submit Exam with Confirmation
**Steps:**
1. Click "Submit Exam" button
2. Observe confirmation modal
3. Read warning about unanswered questions (if any)
4. Click "Submit" to confirm

**Expected Result:**
- Confirmation modal appears
- Shows count of answered/total questions
- Warning displays if questions unanswered
- Cancel button allows return to exam
- Submit processes and transitions to review mode

**Status**: ⏳ Pending

---

### TC-007: Review Completed Exam
**Prerequisites:**
- Exam submitted successfully

**Steps:**
1. Observe review interface
2. Check score display
3. Review each question's result
4. Read explanations for incorrect answers

**Expected Result:**
- Score displayed prominently (percentage)
- Pass/fail indicator (if applicable)
- Time taken shown
- Questions show correct/incorrect status
- Correct answer highlighted
- User's answer shown if incorrect
- Explanations display for all questions
- "Retake" and "Back to Exams" buttons visible

**Status**: ⏳ Pending

---

### TC-008: View Exam Analytics
**Prerequisites:**
- At least one completed exam attempt

**Steps:**
1. Navigate back to exam list
2. Click "Analytics" button on exam card
3. Review analytics dashboard

**Expected Result:**
- Analytics page loads
- Shows attempt history (date, score, time taken)
- Performance trends graph (if multiple attempts)
- Question-level breakdown
- Difficulty distribution
- Topic performance (if topics assigned)

**Status**: ⏳ Pending

---

### TC-009: Retake Exam
**Steps:**
1. From exam list, click "Retake" on previously completed exam
2. Start new attempt
3. Submit exam

**Expected Result:**
- New attempt created
- Questions may be shuffled (if randomization enabled)
- Previous answers not pre-filled
- Both attempts appear in analytics

**Status**: ⏳ Pending

---

### TC-010: Timer Expiration Behavior
**Prerequisites:**
- Exam with short time limit (1-2 minutes)

**Steps:**
1. Start exam
2. Answer 1-2 questions
3. Wait for timer to expire (or simulate by setting short limit)

**Expected Result:**
- Timer turns red when < 5 minutes remaining
- Auto-submit occurs when timer reaches 0:00
- User redirected to review page
- Only answered questions scored

**Status**: ⏳ Pending

---

### TC-011: Question Type Variety
**Steps:**
1. Review exam questions
2. Verify different question types display correctly:
   - Multiple Choice (MCQ)
   - True/False
   - Short Answer

**Expected Result:**
- MCQ shows radio buttons with options
- True/False shows two radio buttons
- Short Answer shows text area
- All types render with proper styling
- Answer selection/input works for all types

**Status**: ⏳ Pending

---

### TC-012: Edge Cases & Error Handling

#### TC-012a: Generate Exam with Invalid Document
**Steps:**
1. Try to create exam from document with no text content

**Expected Result:**
- Error message: "Document has no readable text content"
- User returned to document selection

**Status**: ⏳ Pending

#### TC-012b: Generate Exam with Rate Limiting
**Steps:**
1. Create multiple exams rapidly (>10 in 1 minute)

**Expected Result:**
- Rate limit error after threshold
- Clear message about limit and retry time

**Status**: ⏳ Pending

#### TC-012c: Exit Exam Without Submitting
**Steps:**
1. Start exam
2. Answer 2-3 questions
3. Close browser tab or navigate away
4. Return to exam list

**Expected Result:**
- Exam attempt status = "in_progress"
- Ability to resume exam (if implemented)
- OR: Exam marked as "abandoned" after timeout

**Status**: ⏳ Pending

---

## Test Results Summary

| Test Case | Status | Pass/Fail | Notes |
|-----------|--------|-----------|-------|
| TC-001 | ⏳ Pending | - | |
| TC-002 | ⏳ Pending | - | |
| TC-003 | ⏳ Pending | - | |
| TC-004 | ⏳ Pending | - | |
| TC-005 | ⏳ Pending | - | |
| TC-006 | ⏳ Pending | - | |
| TC-007 | ⏳ Pending | - | |
| TC-008 | ⏳ Pending | - | |
| TC-009 | ⏳ Pending | - | |
| TC-010 | ⏳ Pending | - | |
| TC-011 | ⏳ Pending | - | |
| TC-012a | ⏳ Pending | - | |
| TC-012b | ⏳ Pending | - | |
| TC-012c | ⏳ Pending | - | |

---

## Known Issues
_(To be filled during testing)_

---

## Recommendations
_(To be filled after testing)_

---

## Database Verification

### Verify Tables Exist
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('exams', 'exam_questions', 'exam_attempts', 'exam_analytics', 'question_banks', 'question_bank_items');
```

### Check RLS Policies
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('exams', 'exam_questions', 'exam_attempts', 'exam_analytics');
```

---

## API Endpoints to Test

1. **POST** `/api/generate-exam` - Generate exam from document
2. **GET** `/api/exams` - List all user exams (with `?includeAttempts=true`)
3. **GET** `/api/exams/[id]` - Get exam details (with `?includeQuestions=true`)
4. **POST** `/api/exams/[id]/attempts` - Start new exam attempt
5. **PUT** `/api/exams/[id]/attempts` - Update attempt (auto-save, submit)
6. **GET** `/api/exams/attempts/[attemptId]` - Get attempt for review
7. **GET** `/api/exams/[id]/analytics` - Get exam analytics

---

## Performance Metrics to Monitor

- Exam generation time (should be < 60 seconds for 10 questions)
- Exam interface load time (should be < 2 seconds)
- Auto-save latency (should not interrupt user)
- Timer accuracy (should match actual elapsed time)
- Analytics calculation time (should be < 3 seconds)

---

## Next Steps After Testing

1. Document all bugs found
2. Create GitHub issues for critical bugs
3. Update user documentation
4. Add feature to production deployment checklist
5. Consider additional features:
   - Question shuffling/randomization
   - Resume in-progress exams
   - Export exam results (PDF)
   - Comparative analytics (vs other users)
   - Adaptive difficulty
