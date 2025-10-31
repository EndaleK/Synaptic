# Synaptic Beta Testing Guide

Thank you for helping test **Synaptic** - an AI-powered personalized learning platform! This guide will help you thoroughly test all features and provide valuable feedback.

## Table of Contents

1. [What is Synaptic?](#what-is-synaptic)
2. [Getting Started](#getting-started)
3. [Testing Timeline](#testing-timeline)
4. [Features to Test](#features-to-test)
5. [What to Look For](#what-to-look-for)
6. [How to Report Feedback](#how-to-report-feedback)
7. [Troubleshooting](#troubleshooting)
8. [Privacy & Data](#privacy--data)

---

## What is Synaptic?

Synaptic is an AI-powered learning platform that adapts to your learning style and helps you study smarter. Unlike traditional study tools, Synaptic acts as an active teacher, using Socratic dialogue to guide you through learning.

### Key Features

- **Document Chat**: Upload documents and engage with an AI teacher that guides you with questions instead of giving direct answers
- **Flashcard Generation**: Automatically generate flashcards from uploaded documents
- **Mind Map Visualization**: Extract hierarchical concepts as interactive mind maps
- **Learning Style Assessment**: Quiz-based detection of your learning preferences (coming soon)
- **Multi-format Support**: Works with PDF, DOCX, DOC, TXT, and JSON files

---

## Getting Started

### 1. Create Your Account

1. Navigate to the app URL provided in your invitation email
2. Click "Sign Up"
3. Create an account using your email address or Google account
4. Verify your email if prompted
5. Sign in to access the dashboard

### 2. Familiarize Yourself with the Interface

After signing in, you'll see the **Dashboard** with different learning mode tiles:
- **Document Chat** - Upload and discuss documents with AI
- **Flashcards** - Generate and review flashcards
- **Mind Maps** - Visualize concepts and relationships
- **Settings** - Customize your experience (theme, preferences)

### 3. Prepare Test Documents

For the best testing experience, prepare a few documents:
- ✅ **PDF files**: Textbooks, articles, study guides (text-based, not scanned images)
- ✅ **Word documents** (.docx or .doc): Notes, essays, research papers
- ✅ **Text files** (.txt): Simple notes, outlines
- ❌ **Scanned PDFs**: Currently not supported (requires OCR)
- ❌ **Encrypted/password-protected PDFs**: Not supported

**Recommended test files:**
- Short document (1-3 pages) - Quick testing
- Medium document (5-10 pages) - Standard use case
- Long document (20+ pages) - Stress testing

---

## Testing Timeline

**Duration:** 1-2 weeks (flexible)

### Week 1: Exploration
- Set up your account
- Test each feature at least once
- Try different document types
- Explore the interface and settings

### Week 2: Deep Testing
- Use the app for actual studying/learning
- Test edge cases (large files, special formats)
- Identify pain points and frustrations
- Note any bugs or unexpected behavior

**Send feedback anytime** - don't wait until the end!

---

## Features to Test

### 1. Document Upload & Chat

**What it does:** Upload a document and have a conversation with an AI teacher about its contents. The AI uses Socratic teaching methods.

**How to test:**

1. Go to Dashboard → Click "Document Chat" tile
2. Upload a document (PDF, DOCX, TXT)
3. Wait for processing (may take a few seconds)
4. Ask questions about the document content

**Test scenarios:**

✅ **Basic functionality:**
- Upload different file formats (PDF, DOCX, TXT)
- Ask simple questions about document content
- Verify AI responses are relevant to the document

✅ **Socratic teaching:**
- Ask the AI to explain a concept
- Notice if it asks you questions instead of giving direct answers
- Try saying "I don't know" and see how it guides you

✅ **Edge cases:**
- Upload a very short document (1 paragraph)
- Upload a long document (20+ pages)
- Upload a document with tables, images, or formatting
- Try uploading unsupported formats

**What to look for:**
- ✓ Document uploads successfully
- ✓ AI understands document content accurately
- ✓ Responses are helpful and educational
- ✓ Teaching style is Socratic (guiding vs. telling)
- ✗ Errors during upload
- ✗ AI gives irrelevant or incorrect answers
- ✗ Processing takes too long
- ✗ Can't upload certain file types

---

### 2. Flashcard Generation

**What it does:** Automatically extracts key concepts from your documents and creates flashcards with questions and answers.

**How to test:**

1. Go to Dashboard → Click "Flashcards" tile
2. Upload a document
3. Wait for AI to generate flashcards (5-15 cards)
4. Review flashcards using the flip interface
5. Mark cards as "Got it" (green) or "Needs review" (red)

**Test scenarios:**

✅ **Basic functionality:**
- Generate flashcards from different document types
- Flip cards to see answers
- Navigate through cards (arrows or keyboard)
- Track your mastery progress

✅ **Quality testing:**
- Check if questions are relevant to document content
- Verify answers are accurate and complete
- Note if any important concepts are missing
- Check if cards are too easy, too hard, or just right

✅ **Progress tracking:**
- Mark some cards as "Got it" (green button)
- Mark some cards as "Needs review" (red button)
- Regenerate flashcards and see if mastery buttons appear

✅ **Export functionality:**
- Click "Export JSON" to download flashcards
- Verify downloaded file contains all cards

**What to look for:**
- ✓ Flashcards are generated successfully
- ✓ Questions are clear and relevant
- ✓ Answers are accurate
- ✓ Card flip animation works smoothly
- ✓ Mastery tracking buttons work
- ✓ Progress is saved between sessions
- ✗ Generation fails or times out
- ✗ Flashcards contain incorrect information
- ✗ Can't navigate between cards
- ✗ Mastery buttons don't work or show wrong message

---

### 3. Mind Map Visualization

**What it does:** Analyzes your document and creates an interactive mind map showing concepts and their relationships.

**How to test:**

1. Go to Dashboard → Click "Mind Maps" tile
2. Upload a document
3. Wait for AI to generate the mind map (may take 1-2 minutes for long documents)
4. Explore the interactive visualization

**Test scenarios:**

✅ **Basic functionality:**
- Generate mind maps from different documents
- Zoom in/out using controls or mouse wheel
- Drag to pan around the canvas
- Click nodes to see details (if interactive)

✅ **Visual design:**
- Check if nodes are clearly labeled
- Verify connections between concepts make sense
- Note if colors help distinguish different concept types
- Check if layout is readable and not cluttered

✅ **Edge cases:**
- Generate from a very simple document (1-2 concepts)
- Generate from a complex document (many concepts)
- Try documents from different subjects (science, history, literature)

**What to look for:**
- ✓ Mind map generates successfully
- ✓ Concepts are accurately extracted
- ✓ Relationships between concepts are logical
- ✓ Visual layout is clear and readable
- ✓ Colors and styling help understanding
- ✓ Interactive controls work smoothly
- ✗ Generation fails or times out (especially for large documents)
- ✗ Mind map is too cluttered or hard to read
- ✗ Connections don't make sense
- ✗ Important concepts are missing

---

### 4. Dashboard & Navigation

**What it does:** Central hub for accessing all features and managing your learning.

**How to test:**

1. Explore the main dashboard
2. Click different learning mode tiles
3. Use the sidebar navigation
4. Test theme toggle (light/dark mode)
5. Check settings page

**Test scenarios:**

✅ **Navigation:**
- Click each tile and verify it goes to correct feature
- Use browser back button - does it work correctly?
- Check sidebar navigation on mobile (if testing on phone)
- Sign out and sign back in

✅ **Settings:**
- Toggle between light and dark mode
- Check if theme preference is saved
- Try changing other settings (if available)
- Verify settings persist after refresh

✅ **Responsive design:**
- Test on desktop computer (Chrome, Firefox, Safari)
- Test on tablet if available
- Test on mobile phone
- Resize browser window - does layout adapt?

**What to look for:**
- ✓ All navigation works correctly
- ✓ Theme toggle works and persists
- ✓ Interface is intuitive and easy to use
- ✓ Responsive on different screen sizes
- ✗ Broken links or navigation
- ✗ Layout breaks on certain screen sizes
- ✗ Settings don't save

---

### 5. General User Experience

**What it does:** Overall feel and usability of the application.

**Test scenarios:**

✅ **First impressions:**
- Is the purpose of the app clear?
- Is it easy to figure out how to use features?
- Does it feel professional and polished?

✅ **Performance:**
- How fast do pages load?
- Are there noticeable delays or lag?
- Do animations feel smooth?

✅ **Error handling:**
- Try uploading invalid files
- Try using features without uploading documents
- Try clicking buttons multiple times quickly
- What happens when something goes wrong?

**What to look for:**
- ✓ App feels fast and responsive
- ✓ Clear error messages when things go wrong
- ✓ Design is attractive and modern
- ✓ Intuitive to use without instructions
- ✗ Confusing interface elements
- ✗ Slow loading or processing times
- ✗ Cryptic error messages
- ✗ App crashes or freezes

---

## What to Look For

### Things That Should Work ✓

- **Upload documents** in PDF, DOCX, DOC, TXT formats
- **Chat with AI** about uploaded documents
- **Generate flashcards** automatically (5-15 cards)
- **Review flashcards** with flip animation
- **Track mastery** with green/red buttons
- **Generate mind maps** with visual concept relationships
- **Navigate smoothly** between features
- **Toggle dark/light mode** and have it persist
- **Sign in/out** without issues
- **Use on mobile and desktop** (responsive design)

### Common Issues to Report ✗

- **Upload failures** or unsupported file types
- **Slow processing** or timeouts
- **Incorrect AI responses** or hallucinations
- **Missing content** from documents
- **Broken navigation** or links
- **UI glitches** or layout issues
- **Mastery tracking** not working
- **Data not persisting** between sessions
- **Mobile responsiveness** problems
- **Browser compatibility** issues

### Edge Cases to Try

- Upload a **very large document** (50+ pages, 100+ pages)
- Upload a **very small document** (1 paragraph)
- Upload documents with **special formatting** (tables, images, equations)
- Upload documents in **different languages**
- Try **rapid clicking** on buttons
- Try using features **without uploading documents** first
- Try **refreshing the page** mid-process
- Test on **different browsers** (Chrome, Firefox, Safari, Edge)
- Test on **slow internet connection**
- Try **multiple uploads in sequence** without refreshing

---

## How to Report Feedback

### Email Format

Send your feedback to: **[YOUR_EMAIL@example.com]** *(Replace with your actual email)*

**Subject line:** `Synaptic Beta Feedback - [Your Name]`

### What to Include

Use the **Feedback Template** (FEEDBACK_TEMPLATE.md) or structure your email with these sections:

1. **Feature/Area Tested:** Which feature were you using?
2. **What Worked Well:** Positive experiences, things you liked
3. **What Didn't Work:** Problems, bugs, confusing parts
4. **Bug Reports:** Specific issues with steps to reproduce
5. **Suggestions:** Ideas for improvements
6. **Overall Impression:** General thoughts about the app

### Priority Levels

Help us prioritize by marking bugs:
- 🔴 **Critical:** App crashes, data loss, can't use feature at all
- 🟡 **Important:** Feature works but with significant issues
- 🟢 **Minor:** Small bugs, cosmetic issues, nice-to-have improvements

### Examples

**Good bug report:**
```
Feature: Flashcard Generation
Bug: Mastery tracking buttons don't appear after regeneration
Steps to reproduce:
1. Upload "biology-notes.pdf"
2. Generate flashcards
3. Mark 2 cards as "Got it"
4. Regenerate new flashcards
5. Notice mastery buttons missing

Expected: Buttons should appear for saved flashcards
Actual: Shows "Regenerate flashcards to enable progress tracking"
Priority: 🟡 Important
```

**Good suggestion:**
```
Feature: Mind Maps
Suggestion: Add ability to export mind map as image (PNG/SVG)
Reason: Would be helpful for including in study notes or presentations
Priority: 🟢 Nice-to-have
```

---

## Troubleshooting

### Common Issues & Solutions

#### "Failed to upload document"
- **Check file size:** Maximum 100MB
- **Check file type:** Only PDF, DOCX, DOC, TXT supported
- **Try different file:** Some PDFs are encrypted or scanned (images only)
- **Check internet:** Make sure you have stable connection

#### "Mind map generation failed" or timeout error
- **Wait longer:** Large documents can take 2-5 minutes
- **Try smaller document:** Break large files into sections
- **Refresh and retry:** Sometimes helps with timeout issues
- **Report if persistent:** This may be a configuration issue

#### "Flashcard not found" error
- **Regenerate flashcards:** This enables progress tracking
- **This is expected** for in-memory flashcards from earlier sessions

#### PDF shows but can't extract text
- **Scanned PDFs:** Need OCR (not supported yet)
- **Encrypted PDFs:** Remove password protection first
- **Image-based PDFs:** Convert to text-based PDF

#### Dark mode doesn't persist
- **Clear browser cache:** Then toggle dark mode again
- **Check browser settings:** Make sure cookies are enabled
- **Try different browser:** Report if issue persists

#### Can't sign in / "Session expired"
- **Clear cookies:** Then try signing in again
- **Check email verification:** Make sure you verified your email
- **Try password reset:** If forgot password
- **Contact us:** If issue persists

---

## Privacy & Data

### What Data is Collected?

- **Account information:** Email, name (from sign-up)
- **Uploaded documents:** Stored securely in our database
- **Usage data:** Which features you use, error logs
- **Learning progress:** Flashcard mastery levels, review history

### Data Security

- ✅ All data is encrypted in transit (HTTPS)
- ✅ Stored securely in Supabase (PostgreSQL database)
- ✅ Your documents are NOT shared with other users
- ✅ Row-Level Security ensures you only see your own data
- ✅ AI processing uses OpenAI/DeepSeek APIs (data not used for training)

### Data Access

- Only **you** can access your documents and learning data
- Beta test **administrators** can see anonymized usage statistics
- **AI providers** (OpenAI, DeepSeek) temporarily process document text for generation but don't store it

### Data Deletion

To delete your data:
1. Go to Settings → Account
2. Click "Delete Account" (feature may not be live yet)
3. Or email us to request data deletion

---

## Questions?

If you have questions during testing:
- **Email:** [YOUR_EMAIL@example.com]
- **Expected response time:** Within 24-48 hours

---

## Thank You!

Your feedback is invaluable in making Synaptic the best learning platform possible. We appreciate you taking the time to test and help us improve!

**Happy testing!** 🚀

---

**Version:** 1.0
**Last Updated:** October 2024
