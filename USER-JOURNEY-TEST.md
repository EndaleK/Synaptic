# User Journey Test - Step-by-Step Guide

**Test Date**: _____________
**Tester Name**: _____________
**Browser**: _____________
**Device**: _____________

---

## Overview

This is a comprehensive end-to-end test of the complete user journey from sign-up to content generation. Follow each step carefully and mark items as you complete them.

**Total Estimated Time**: 80 minutes
**Prerequisites**:
- Sample documents ready (PDF, DOCX)
- Valid email address for sign-up
- AI API keys configured

---

## Part 1: Authentication Flow (10 minutes)

### 1.1 Sign Up Journey

**URL**: http://localhost:3003/sign-up

**Steps**:
1. [ ] Navigate to `/sign-up`
2. [ ] Fill out sign-up form:
   - Email: _____________
   - Password: _____________
   - Confirm password: _____________
3. [ ] Click "Sign Up" button
4. [ ] Verify email confirmation sent (check inbox)
5. [ ] Click verification link in email
6. [ ] Confirm account verified message

**Expected Results**:
- [ ] No console errors
- [ ] Form validation works (invalid email shows error)
- [ ] Password strength indicator shows
- [ ] Successful sign-up redirects to dashboard
- [ ] Welcome message displays user's name

**Issues Found**:
```
___________________________________________
___________________________________________
___________________________________________
```

### 1.2 Dashboard First Load

**URL**: http://localhost:3003/dashboard (auto-redirect after sign-up)

**Check**:
1. [ ] Dashboard loads successfully
2. [ ] Welcome banner shows user's name
3. [ ] Current date displays correctly
4. [ ] Sidebar shows all learning modes
5. [ ] No errors in browser console (F12)

**Verify Database**:
```bash
# Check user_profiles table was created
# Should see new record with clerk_user_id
```

**Expected Results**:
- [ ] Dashboard shows "empty state" (no documents yet)
- [ ] All UI elements render properly
- [ ] Learning mode tiles are clickable
- [ ] Sidebar navigation works

**Issues Found**:
```
___________________________________________
___________________________________________
___________________________________________
```

---

## Part 2: Document Upload (15 minutes)

### 2.1 Upload First Document (PDF)

**Steps**:
1. [ ] Click "Library" in sidebar (or "Upload Document" button)
2. [ ] Click "Upload New Document"
3. [ ] Select a PDF file (< 10MB for first test)
   - File name: _____________
   - File size: _____________
4. [ ] Wait for upload progress
5. [ ] Verify text extraction completes

**Expected Results**:
- [ ] Upload progress bar shows
- [ ] Text extraction completes within 30 seconds
- [ ] Document appears in library
- [ ] Document title extracted correctly
- [ ] File size shows correctly
- [ ] Preview/download buttons work

**Issues Found**:
```
___________________________________________
___________________________________________
___________________________________________
```

### 2.2 Upload Second Document (DOCX)

**Steps**:
1. [ ] Click "Upload New Document" again
2. [ ] Select a DOCX file
   - File name: _____________
   - File size: _____________
3. [ ] Wait for upload and extraction

**Expected Results**:
- [ ] DOCX uploads successfully
- [ ] Text extracted correctly
- [ ] Both documents now visible in library

**Issues Found**:
```
___________________________________________
___________________________________________
___________________________________________
```

### 2.3 Test Edge Cases

#### Empty Document
1. [ ] Try uploading empty/blank PDF
2. [ ] Verify appropriate error message

#### Encrypted PDF
1. [ ] Try uploading password-protected PDF
2. [ ] Verify error: "PDF is encrypted"

#### Scanned PDF (Image-based)
1. [ ] Try uploading scanned PDF with no text
2. [ ] Verify error suggests OCR

**Results**:
```
___________________________________________
___________________________________________
___________________________________________
```

---

## Part 3: Flashcard Generation (20 minutes)

### 3.1 Generate Flashcards from First Document

**Steps**:
1. [ ] Select first document from library
2. [ ] Click "Generate Flashcards" button
3. [ ] If topic selection appears:
   - [ ] Review extracted topics
   - [ ] Select 2-3 topics
   - [ ] Click "Generate"
4. [ ] Wait for generation (should be < 60s for 20 cards)

**Monitor**:
- [ ] Loading indicator shows
- [ ] Progress percentage updates (if shown)
- [ ] No console errors

**Expected Results**:
- [ ] Flashcards generated successfully
- [ ] Cards display with front/back
- [ ] Can flip cards
- [ ] Navigation works (next/previous)
- [ ] Card count matches expected

**Flashcard Quality Check**:
1. [ ] Questions relevant to document content?
2. [ ] Answers accurate?
3. [ ] No formatting issues?
4. [ ] No truncated text?

**Issues Found**:
```
___________________________________________
___________________________________________
___________________________________________
```

### 3.2 Study Flashcards (Spaced Repetition)

**Steps**:
1. [ ] View first flashcard
2. [ ] Read question
3. [ ] Click to flip and see answer
4. [ ] Rate difficulty: "Again" / "Hard" / "Good" / "Easy"
5. [ ] Repeat for 5 cards
6. [ ] Mark 2 as "Easy", 2 as "Good", 1 as "Hard"

**Expected Results**:
- [ ] Rating buttons work
- [ ] Next card loads automatically after rating
- [ ] Progress tracking updates
- [ ] Review queue updates based on ratings
- [ ] Next review date calculated

**Check Database**:
```sql
-- Verify flashcards saved with spaced repetition fields
SELECT id, question, next_review, easiness_factor, interval, repetitions
FROM flashcards
WHERE user_id = [your_user_id]
ORDER BY created_at DESC
LIMIT 5;
```

**Issues Found**:
```
___________________________________________
___________________________________________
___________________________________________
```

---

## Part 4: Podcast Generation (15 minutes)

### 4.1 Generate Podcast from Document

**Prerequisites**:
- [ ] LEMONFOX_API_KEY or OPENAI_API_KEY configured

**Steps**:
1. [ ] Select document
2. [ ] Click "Generate Podcast" button
3. [ ] If topic selection appears:
   - [ ] Select 1-2 topics for shorter generation time
   - [ ] Click "Generate"
4. [ ] Wait for script generation (30-60 seconds)
5. [ ] Wait for TTS audio generation (60-120 seconds)

**Monitor**:
- [ ] Script generation progress
- [ ] TTS progress indicator
- [ ] No timeout errors

**Expected Results**:
- [ ] Podcast script appears
- [ ] Audio player loads
- [ ] Play button works
- [ ] Audio quality is clear
- [ ] Playback controls work (play/pause/seek)
- [ ] Volume control works
- [ ] Download button works

**Content Quality**:
1. [ ] Script summarizes document well?
2. [ ] Audio pronunciation correct?
3. [ ] Pacing reasonable?
4. [ ] No awkward pauses?

**Issues Found**:
```
___________________________________________
___________________________________________
___________________________________________
```

---

## Part 5: Mind Map Generation (15 minutes)

### 5.1 Generate Mind Map

**Steps**:
1. [ ] Select document
2. [ ] Click "Generate Mind Map"
3. [ ] If topic selection appears, select all topics
4. [ ] Wait for generation (30-90 seconds depending on complexity)

**Expected Results**:
- [ ] Mind map visualization renders
- [ ] Root node shows document title
- [ ] Child nodes show main topics
- [ ] Sub-nodes show concepts

**Interaction Tests**:
1. [ ] Click node to expand/collapse children
2. [ ] Drag to pan around map
3. [ ] Scroll to zoom in/out
4. [ ] Click node to see description (if implemented)

**Visual Quality**:
- [ ] Nodes properly spaced
- [ ] Connection lines clear
- [ ] Text readable
- [ ] Colors differentiate levels
- [ ] No overlapping nodes

**Issues Found**:
```
___________________________________________
___________________________________________
___________________________________________
```

---

## Part 6: Mock Exam (20 minutes)

### 6.1 Create Exam

**Steps**:
1. [ ] Click "Mock Exams" in sidebar or learning modes
2. [ ] Click "Create New Exam"
3. [ ] Select a document from modal
4. [ ] Configure exam:
   - Title: "End-to-End Test Exam"
   - Description: "Testing full exam flow"
   - Question count: 5 (for quick testing)
   - Difficulty: Mixed
   - Time limit: 10 minutes
   - Enable explanations: Yes
5. [ ] Click "Generate Exam"
6. [ ] Wait for generation (30-60 seconds for 5 questions)

**Expected Results**:
- [ ] Exam generation completes
- [ ] Success message appears
- [ ] New exam appears in exam list
- [ ] Exam card shows correct details

**Issues Found**:
```
___________________________________________
___________________________________________
___________________________________________
```

### 6.2 Take Exam

**Steps**:
1. [ ] Click "Start Exam" on newly created exam
2. [ ] Verify exam interface loads
3. [ ] Check timer starts countdown
4. [ ] Answer questions:
   - Question 1 (type: ______): Answer: ______
   - Question 2 (type: ______): Answer: ______
   - Question 3 (type: ______): Answer: ______
   - Question 4 (type: ______): Answer: ______
   - Question 5 (type: ______): Answer: ______
5. [ ] Test navigation:
   - Click "Next" to move forward
   - Click "Previous" to go back
   - Verify answers retained
6. [ ] Use question navigator to jump to different questions
7. [ ] Click "Submit Exam"
8. [ ] Review confirmation modal
9. [ ] Click "Submit" to confirm

**Expected Results**:
- [ ] Timer counts down correctly
- [ ] All question types work (MCQ, True/False, Short Answer)
- [ ] Answers save immediately
- [ ] Navigation works smoothly
- [ ] Question navigator updates (answered questions show green)
- [ ] Submission modal shows answered count
- [ ] Warning shows for unanswered questions

**Issues Found**:
```
___________________________________________
___________________________________________
___________________________________________
```

### 6.3 Review Exam Results

**After Submission**:
1. [ ] Review screen loads
2. [ ] Score displays prominently
3. [ ] Time taken shows
4. [ ] Can see each question's result (correct/incorrect)
5. [ ] Correct answers highlighted
6. [ ] Explanations display for all questions
7. [ ] "Retake" button visible
8. [ ] "Back to Exams" button visible

**Expected Results**:
- [ ] Score calculated correctly
- [ ] Correct/incorrect indicators accurate
- [ ] Explanations helpful and relevant
- [ ] Can review all questions

**Issues Found**:
```
___________________________________________
___________________________________________
___________________________________________
```

---

## Part 7: Chat with Document (10 minutes)

### 7.1 Start Chat Session

**Steps**:
1. [ ] Select document
2. [ ] Click "Chat" button
3. [ ] Wait for chat interface to load

**Ask Questions** (test Socratic method):
1. **Question 1**: "What is [main topic from document]?"
   - [ ] Response received within 10 seconds
   - [ ] Response is Socratic (guiding, not direct answer)
   - [ ] Response relevant to document

2. **Question 2**: "Can you explain [specific concept]?"
   - [ ] Response references document content
   - [ ] Follow-up questions suggested

3. **Question 3**: "Summarize [specific section]"
   - [ ] Summary accurate
   - [ ] Appropriate length

**Expected Results**:
- [ ] Chat loads quickly
- [ ] Input field responsive
- [ ] Responses stream in (if streaming enabled)
- [ ] Conversation history persists
- [ ] Can scroll through conversation
- [ ] No lag or delays

**Issues Found**:
```
___________________________________________
___________________________________________
___________________________________________
```

---

## Part 8: Video Learning (Optional - 5 minutes)

**Prerequisites**: YOUTUBE_API_KEY configured

**Steps**:
1. [ ] Click "Video" in learning modes
2. [ ] Search for a topic: _____________
3. [ ] Select a video from results
4. [ ] Wait for transcript extraction
5. [ ] Try generating content from transcript

**Expected Results**:
- [ ] YouTube search works
- [ ] Video results display with thumbnails
- [ ] Transcript extracts successfully
- [ ] Can generate flashcards/summary from video

**Issues Found**:
```
___________________________________________
___________________________________________
___________________________________________
```

---

## Part 9: Data Persistence (5 minutes)

### 9.1 Logout and Login

**Steps**:
1. [ ] Click "Sign Out" button
2. [ ] Verify redirected to sign-in page
3. [ ] Sign back in with same credentials
4. [ ] Navigate to dashboard

**Expected Results**:
- [ ] All documents still in library
- [ ] Flashcards still available
- [ ] Study progress retained
- [ ] Exam history preserved
- [ ] Chat history available

**Issues Found**:
```
___________________________________________
___________________________________________
___________________________________________
```

### 9.2 Browser Refresh Test

**Steps**:
1. [ ] While on dashboard, press F5 to refresh
2. [ ] Navigate to Flashcards view
3. [ ] Refresh page (F5)
4. [ ] Navigate to Mock Exams
5. [ ] Refresh page (F5)

**Expected Results**:
- [ ] No data loss after refresh
- [ ] Current view state maintained
- [ ] No authentication errors
- [ ] Page loads quickly after refresh

**Issues Found**:
```
___________________________________________
___________________________________________
___________________________________________
```

---

## Part 10: Error Handling (5 minutes)

### 10.1 Network Interruption

**Test** (if possible):
1. [ ] Start flashcard generation
2. [ ] Disconnect internet briefly
3. [ ] Reconnect

**Expected Results**:
- [ ] Appropriate error message
- [ ] Option to retry
- [ ] No data corruption

### 10.2 Invalid Actions

**Test**:
1. [ ] Try generating flashcards with no document selected
2. [ ] Try uploading file > 100MB
3. [ ] Try uploading unsupported file type (.exe, .zip)

**Expected Results**:
- [ ] Clear error messages
- [ ] User can recover gracefully
- [ ] No console crashes

**Issues Found**:
```
___________________________________________
___________________________________________
___________________________________________
```

---

## Test Summary

### Overall Results

**Total Time Spent**: _______ minutes

**Pass/Fail Breakdown**:
- Authentication: _____ / _____ passed
- Document Upload: _____ / _____ passed
- Flashcard Generation: _____ / _____ passed
- Podcast Generation: _____ / _____ passed
- Mind Map: _____ / _____ passed
- Mock Exam: _____ / _____ passed
- Chat: _____ / _____ passed
- Data Persistence: _____ / _____ passed
- Error Handling: _____ / _____ passed

**Overall Pass Rate**: ______%

### Critical Issues (Blocker)
```
1. _________________________________________
2. _________________________________________
3. _________________________________________
```

### High Priority Issues
```
1. _________________________________________
2. _________________________________________
3. _________________________________________
```

### Medium Priority Issues
```
1. _________________________________________
2. _________________________________________
3. _________________________________________
```

### Low Priority / Nice to Have
```
1. _________________________________________
2. _________________________________________
3. _________________________________________
```

### Performance Notes
- Average page load time: _______
- Document upload speed: _______
- Flashcard generation time: _______
- Podcast generation time: _______

### Browser Console Errors
```
___________________________________________
___________________________________________
___________________________________________
```

### Network Tab Observations
- Failed requests: _______
- Slowest API call: _______
- Average API response time: _______

---

## Recommendations

### Must Fix Before Launch:
```
___________________________________________
___________________________________________
___________________________________________
```

### Should Fix Soon:
```
___________________________________________
___________________________________________
___________________________________________
```

### Future Improvements:
```
___________________________________________
___________________________________________
___________________________________________
```

---

## Sign-Off

**Tested By**: _____________________
**Date**: _____________________
**Ready for Production**: [ ] Yes [ ] No [ ] With Fixes

**Comments**:
```
___________________________________________
___________________________________________
___________________________________________
___________________________________________
```

---

**Version**: 1.0
**Last Updated**: November 9, 2025
