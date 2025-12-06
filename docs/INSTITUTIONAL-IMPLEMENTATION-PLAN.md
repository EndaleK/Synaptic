# Synaptic Institutional Implementation Plan

## Executive Summary

This document outlines the technical implementation plan to transform Synaptic from a consumer B2C app into an institutional-ready B2B2C platform suitable for school boards, universities, and corporate training departments.

**Estimated Development Effort**: 6-10 weeks (solo developer) or 3-5 weeks (2-3 developers)

---

## Phase 1: Multi-Tenancy Foundation (Week 1-2)

### 1.1 New Database Tables

```sql
-- ============================================================================
-- ORGANIZATIONS TABLE (School Districts, Universities, Companies)
-- ============================================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier (e.g., "seattle-schools")
  type TEXT NOT NULL CHECK (type IN ('k12_district', 'university', 'corporate', 'other')),
  logo_url TEXT,
  primary_color TEXT DEFAULT '#7B3FF2', -- Brand customization
  secondary_color TEXT DEFAULT '#2D3E9F',

  -- Contact & billing
  admin_email TEXT NOT NULL,
  billing_email TEXT,
  phone TEXT,
  address JSONB, -- {street, city, state, zip, country}

  -- Subscription
  subscription_tier TEXT DEFAULT 'pilot' CHECK (subscription_tier IN ('pilot', 'basic', 'professional', 'enterprise')),
  max_seats INTEGER DEFAULT 100,
  current_seats INTEGER DEFAULT 0,
  subscription_start DATE,
  subscription_end DATE,
  stripe_customer_id TEXT,

  -- Settings
  settings JSONB DEFAULT '{}'::jsonb, -- Feature flags, defaults
  sso_config JSONB, -- SAML/OAuth config for enterprise SSO

  -- Compliance
  ferpa_agreement_signed BOOLEAN DEFAULT FALSE,
  data_retention_days INTEGER DEFAULT 365,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SCHOOLS TABLE (Individual Schools within a District)
-- ============================================================================
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL, -- Unique within org
  type TEXT CHECK (type IN ('elementary', 'middle', 'high', 'college', 'other')),
  address JSONB,
  principal_name TEXT,
  principal_email TEXT,

  settings JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(organization_id, slug)
);

-- ============================================================================
-- CLASSES TABLE (Courses/Sections)
-- ============================================================================
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,

  name TEXT NOT NULL, -- "AP Biology - Period 3"
  subject TEXT, -- "Biology", "Mathematics", etc.
  grade_level TEXT, -- "9", "10-12", "College Freshman"
  section_code TEXT, -- "BIO101-03"

  -- Enrollment
  join_code TEXT UNIQUE, -- 6-character code for students to join
  max_students INTEGER DEFAULT 35,
  is_archived BOOLEAN DEFAULT FALSE,

  -- Schedule
  academic_year TEXT, -- "2024-2025"
  semester TEXT CHECK (semester IN ('fall', 'spring', 'summer', 'full_year')),
  start_date DATE,
  end_date DATE,

  -- Settings
  settings JSONB DEFAULT '{}'::jsonb, -- Class-specific feature flags

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CLASS ENROLLMENTS TABLE
-- ============================================================================
CREATE TABLE class_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,

  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  enrolled_by UUID REFERENCES user_profiles(id), -- Teacher or self-enrolled
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dropped', 'completed')),

  UNIQUE(class_id, student_id)
);

-- ============================================================================
-- ORGANIZATION MEMBERS TABLE (Staff Roles)
-- ============================================================================
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL, -- NULL = district-wide access

  role TEXT NOT NULL CHECK (role IN (
    'org_admin',      -- Full org access (superintendent, IT admin)
    'school_admin',   -- School-level admin (principal)
    'teacher',        -- Can create classes, view own students
    'teaching_assistant', -- Limited teacher access
    'student'         -- Basic access
  )),

  title TEXT, -- "Math Teacher", "Principal", etc.
  department TEXT,

  invited_by UUID REFERENCES user_profiles(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,

  is_active BOOLEAN DEFAULT TRUE,

  UNIQUE(organization_id, user_id)
);

-- ============================================================================
-- CURRICULUM LIBRARY TABLE (Shared Resources)
-- ============================================================================
CREATE TABLE curriculum_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL, -- NULL = org-wide

  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  grade_levels TEXT[], -- ["9", "10", "11"]

  -- Standards alignment
  standards JSONB, -- [{"code": "CCSS.MATH.8.G.1", "description": "..."}]

  -- Access control
  visibility TEXT DEFAULT 'organization' CHECK (visibility IN ('private', 'school', 'organization')),
  created_by UUID REFERENCES user_profiles(id),
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,

  -- Usage tracking
  usage_count INTEGER DEFAULT 0,

  tags TEXT[],

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ASSIGNMENTS TABLE
-- ============================================================================
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  created_by UUID REFERENCES user_profiles(id),

  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('flashcards', 'quiz', 'exam', 'reading', 'podcast', 'mindmap')),

  -- Link to content
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  flashcard_set_id UUID, -- Reference to a specific flashcard set
  exam_id UUID REFERENCES exams(id) ON DELETE SET NULL,

  -- Requirements
  due_date TIMESTAMP WITH TIME ZONE,
  min_cards_to_review INTEGER, -- For flashcard assignments
  min_score_percent INTEGER, -- For quiz/exam assignments
  required_time_minutes INTEGER, -- Minimum study time

  -- Settings
  allow_late_submission BOOLEAN DEFAULT TRUE,
  max_attempts INTEGER, -- NULL = unlimited
  show_answers_after_due BOOLEAN DEFAULT TRUE,

  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ASSIGNMENT SUBMISSIONS TABLE
-- ============================================================================
CREATE TABLE assignment_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,

  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'submitted', 'graded')),

  -- Progress tracking
  started_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  time_spent_seconds INTEGER DEFAULT 0,

  -- Results
  score_percent NUMERIC(5, 2),
  cards_reviewed INTEGER,
  cards_mastered INTEGER,

  -- For quiz/exam submissions
  attempt_number INTEGER DEFAULT 1,
  exam_attempt_id UUID REFERENCES exam_attempts(id),

  -- Teacher feedback
  feedback TEXT,
  graded_by UUID REFERENCES user_profiles(id),
  graded_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(assignment_id, student_id, attempt_number)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_schools_org_id ON schools(organization_id);
CREATE INDEX idx_classes_school_id ON classes(school_id);
CREATE INDEX idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX idx_classes_join_code ON classes(join_code);
CREATE INDEX idx_class_enrollments_class ON class_enrollments(class_id);
CREATE INDEX idx_class_enrollments_student ON class_enrollments(student_id);
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_curriculum_org ON curriculum_resources(organization_id);
CREATE INDEX idx_assignments_class ON assignments(class_id);
CREATE INDEX idx_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX idx_submissions_student ON assignment_submissions(student_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies will check organization_members for access
-- Example: Teachers can see their own classes
-- Admins can see all classes in their school/org
```

### 1.2 Update Existing Tables

```sql
-- Add organization context to user_profiles
ALTER TABLE user_profiles ADD COLUMN primary_organization_id UUID REFERENCES organizations(id);
ALTER TABLE user_profiles ADD COLUMN account_type TEXT DEFAULT 'individual'
  CHECK (account_type IN ('individual', 'institutional'));

-- Add sharing/assignment context to documents
ALTER TABLE documents ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE documents ADD COLUMN visibility TEXT DEFAULT 'private'
  CHECK (visibility IN ('private', 'class', 'school', 'organization'));
ALTER TABLE documents ADD COLUMN shared_with_classes UUID[]; -- Array of class IDs

-- Add class context to flashcards for assignment tracking
ALTER TABLE flashcards ADD COLUMN class_id UUID REFERENCES classes(id);
ALTER TABLE flashcards ADD COLUMN assignment_id UUID REFERENCES assignments(id);
```

---

## Phase 2: Role-Based Access Control (Week 2-3)

### 2.1 Permission System

```typescript
// lib/permissions/roles.ts

export type Role = 'org_admin' | 'school_admin' | 'teacher' | 'teaching_assistant' | 'student';

export interface Permission {
  // Organization
  'org:view': boolean;
  'org:edit': boolean;
  'org:manage_billing': boolean;
  'org:manage_members': boolean;

  // School
  'school:view': boolean;
  'school:edit': boolean;
  'school:manage_teachers': boolean;

  // Class
  'class:create': boolean;
  'class:edit': boolean;
  'class:delete': boolean;
  'class:view_students': boolean;
  'class:manage_students': boolean;
  'class:view_analytics': boolean;

  // Content
  'content:create': boolean;
  'content:share_to_class': boolean;
  'content:share_to_school': boolean;
  'content:share_to_org': boolean;
  'content:approve_curriculum': boolean;

  // Assignments
  'assignment:create': boolean;
  'assignment:grade': boolean;
  'assignment:view_submissions': boolean;

  // Analytics
  'analytics:view_class': boolean;
  'analytics:view_school': boolean;
  'analytics:view_org': boolean;
  'analytics:export': boolean;
}

export const ROLE_PERMISSIONS: Record<Role, Partial<Permission>> = {
  org_admin: {
    'org:view': true,
    'org:edit': true,
    'org:manage_billing': true,
    'org:manage_members': true,
    'school:view': true,
    'school:edit': true,
    'school:manage_teachers': true,
    'class:view_students': true,
    'class:view_analytics': true,
    'content:approve_curriculum': true,
    'analytics:view_class': true,
    'analytics:view_school': true,
    'analytics:view_org': true,
    'analytics:export': true,
  },
  school_admin: {
    'school:view': true,
    'school:edit': true,
    'school:manage_teachers': true,
    'class:view_students': true,
    'class:view_analytics': true,
    'analytics:view_class': true,
    'analytics:view_school': true,
    'analytics:export': true,
  },
  teacher: {
    'class:create': true,
    'class:edit': true,
    'class:delete': true,
    'class:view_students': true,
    'class:manage_students': true,
    'class:view_analytics': true,
    'content:create': true,
    'content:share_to_class': true,
    'assignment:create': true,
    'assignment:grade': true,
    'assignment:view_submissions': true,
    'analytics:view_class': true,
  },
  teaching_assistant: {
    'class:view_students': true,
    'class:view_analytics': true,
    'content:create': true,
    'assignment:view_submissions': true,
    'analytics:view_class': true,
  },
  student: {
    'content:create': true, // Own content only
  },
};
```

### 2.2 Middleware Enhancement

```typescript
// lib/permissions/check.ts

import { createClient } from '@/lib/supabase/server';

export async function getUserOrgContext(userId: string) {
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from('organization_members')
    .select(`
      role,
      organization_id,
      school_id,
      organizations (
        id, name, slug, settings
      ),
      schools (
        id, name, slug
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  return membership;
}

export async function checkPermission(
  userId: string,
  permission: keyof Permission,
  resourceContext?: {
    classId?: string;
    schoolId?: string;
    orgId?: string;
  }
): Promise<boolean> {
  const context = await getUserOrgContext(userId);
  if (!context) return false;

  const rolePermissions = ROLE_PERMISSIONS[context.role as Role];
  if (!rolePermissions) return false;

  // Check if role has permission
  if (!rolePermissions[permission]) return false;

  // Additional context checks (e.g., teacher can only view their own classes)
  if (resourceContext?.classId && context.role === 'teacher') {
    const supabase = await createClient();
    const { data: classData } = await supabase
      .from('classes')
      .select('teacher_id')
      .eq('id', resourceContext.classId)
      .single();

    if (classData?.teacher_id !== userId) return false;
  }

  return true;
}
```

---

## Phase 3: Teacher Dashboard (Week 3-4)

### 3.1 New Routes

```
app/
├── dashboard/
│   ├── teacher/                    # Teacher-specific views
│   │   ├── page.tsx               # Teacher dashboard home
│   │   ├── classes/
│   │   │   ├── page.tsx           # List all classes
│   │   │   ├── [classId]/
│   │   │   │   ├── page.tsx       # Class detail view
│   │   │   │   ├── students/      # Student roster
│   │   │   │   ├── assignments/   # Manage assignments
│   │   │   │   ├── analytics/     # Class performance
│   │   │   │   └── resources/     # Shared materials
│   │   │   └── new/
│   │   │       └── page.tsx       # Create new class
│   │   ├── assignments/
│   │   │   ├── page.tsx           # All assignments
│   │   │   └── [assignmentId]/
│   │   │       ├── page.tsx       # Assignment detail
│   │   │       └── submissions/   # View submissions
│   │   └── curriculum/
│   │       └── page.tsx           # Curriculum library
│   │
│   ├── admin/                      # Admin views
│   │   ├── page.tsx               # Admin dashboard
│   │   ├── schools/               # Manage schools
│   │   ├── teachers/              # Manage staff
│   │   ├── analytics/             # Org-wide analytics
│   │   └── settings/              # Org settings
```

### 3.2 API Routes

```
app/api/
├── organizations/
│   ├── route.ts                    # GET (list), POST (create)
│   └── [orgId]/
│       ├── route.ts               # GET, PATCH, DELETE
│       ├── members/               # Manage members
│       ├── schools/               # Manage schools
│       └── analytics/             # Org analytics
│
├── schools/
│   ├── route.ts
│   └── [schoolId]/
│       ├── route.ts
│       ├── classes/
│       └── teachers/
│
├── classes/
│   ├── route.ts                    # GET (list teacher's classes), POST
│   ├── join/                       # Student join via code
│   │   └── route.ts
│   └── [classId]/
│       ├── route.ts               # GET, PATCH, DELETE
│       ├── students/              # Roster management
│       │   └── route.ts
│       ├── assignments/
│       │   └── route.ts
│       └── analytics/
│           └── route.ts
│
├── assignments/
│   ├── route.ts
│   └── [assignmentId]/
│       ├── route.ts
│       ├── submit/                # Student submission
│       └── submissions/
│           └── route.ts
│
├── curriculum/
│   └── route.ts                    # Shared curriculum library
```

### 3.3 Teacher Dashboard Component

```typescript
// components/teacher/TeacherDashboard.tsx

export default function TeacherDashboard() {
  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Quick Stats */}
      <div className="col-span-12 grid grid-cols-4 gap-4">
        <StatCard title="Total Students" value={128} icon={Users} />
        <StatCard title="Active Classes" value={4} icon={BookOpen} />
        <StatCard title="Pending Submissions" value={23} icon={Clock} />
        <StatCard title="Avg. Class Performance" value="78%" icon={TrendingUp} />
      </div>

      {/* My Classes */}
      <div className="col-span-8">
        <Card>
          <CardHeader>
            <CardTitle>My Classes</CardTitle>
            <Button>+ New Class</Button>
          </CardHeader>
          <CardContent>
            <ClassList classes={classes} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="col-span-4">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed activities={activities} />
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Assignments */}
      <div className="col-span-6">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Due Dates</CardTitle>
          </CardHeader>
          <CardContent>
            <AssignmentTimeline assignments={upcomingAssignments} />
          </CardContent>
        </Card>
      </div>

      {/* Students Needing Attention */}
      <div className="col-span-6">
        <Card>
          <CardHeader>
            <CardTitle>Students Needing Attention</CardTitle>
          </CardHeader>
          <CardContent>
            <AtRiskStudentsList students={atRiskStudents} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---

## Phase 4: Student Experience (Week 4-5)

### 4.1 Class Join Flow

```typescript
// app/dashboard/join/page.tsx

export default function JoinClassPage() {
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    setLoading(true);
    const res = await fetch('/api/classes/join', {
      method: 'POST',
      body: JSON.stringify({ joinCode }),
    });

    if (res.ok) {
      const { classId } = await res.json();
      router.push(`/dashboard/classes/${classId}`);
    } else {
      toast.error('Invalid join code');
    }
    setLoading(false);
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <Card>
        <CardHeader>
          <CardTitle>Join a Class</CardTitle>
          <CardDescription>
            Enter the 6-character code provided by your teacher
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            className="text-center text-2xl tracking-widest"
          />
        </CardContent>
        <CardFooter>
          <Button onClick={handleJoin} disabled={joinCode.length !== 6 || loading}>
            {loading ? 'Joining...' : 'Join Class'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
```

### 4.2 Student Dashboard Enhancements

```typescript
// components/student/StudentClassView.tsx

export default function StudentClassView({ classId }: { classId: string }) {
  const { data: classData } = useClass(classId);
  const { data: assignments } = useAssignments(classId);

  return (
    <div>
      {/* Class Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-lg text-white">
        <h1 className="text-2xl font-bold">{classData.name}</h1>
        <p>{classData.teacher.full_name} • {classData.section_code}</p>
      </div>

      {/* Assignments */}
      <Tabs defaultValue="current">
        <TabsList>
          <TabsTrigger value="current">Current</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          {assignments.filter(a => a.status === 'in_progress').map(assignment => (
            <AssignmentCard key={assignment.id} assignment={assignment} />
          ))}
        </TabsContent>
      </Tabs>

      {/* Class Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Class Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <ResourceList resources={classData.resources} />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Phase 5: Analytics & Reporting (Week 5-6)

### 5.1 Analytics Data Model

```typescript
// Types for analytics

interface ClassAnalytics {
  classId: string;
  period: 'day' | 'week' | 'month' | 'semester';

  // Engagement
  activeStudents: number;
  totalStudents: number;
  avgSessionsPerStudent: number;
  avgTimePerSession: number;

  // Performance
  avgFlashcardAccuracy: number;
  avgQuizScore: number;
  masteryRate: number; // % of content mastered

  // Progress
  assignmentsCompleted: number;
  assignmentsPending: number;
  onTimeSubmissionRate: number;

  // Trends
  performanceTrend: 'improving' | 'stable' | 'declining';
  engagementTrend: 'improving' | 'stable' | 'declining';
}

interface StudentAnalytics {
  studentId: string;
  classId: string;

  // Study habits
  totalStudyTime: number;
  avgDailyStudyTime: number;
  lastActiveAt: Date;
  streakDays: number;

  // Performance by topic
  topicPerformance: {
    topic: string;
    accuracy: number;
    mastery: 'not_started' | 'learning' | 'reviewing' | 'mastered';
  }[];

  // Spaced repetition stats
  cardsLearned: number;
  cardsDue: number;
  retentionRate: number;

  // Risk indicators
  riskLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
}
```

### 5.2 Analytics API

```typescript
// app/api/classes/[classId]/analytics/route.ts

export async function GET(
  req: NextRequest,
  { params }: { params: { classId: string } }
) {
  const { userId } = await auth();

  // Verify teacher owns this class
  const hasAccess = await checkPermission(userId, 'analytics:view_class', {
    classId: params.classId,
  });

  if (!hasAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const supabase = await createClient();

  // Get class students
  const { data: enrollments } = await supabase
    .from('class_enrollments')
    .select('student_id')
    .eq('class_id', params.classId)
    .eq('status', 'active');

  const studentIds = enrollments.map(e => e.student_id);

  // Aggregate flashcard performance
  const { data: flashcardStats } = await supabase
    .from('flashcards')
    .select('user_id, times_reviewed, times_correct')
    .in('user_id', studentIds)
    .eq('class_id', params.classId);

  // Aggregate study sessions
  const { data: sessionStats } = await supabase
    .from('study_sessions')
    .select('user_id, duration_minutes, session_type')
    .in('user_id', studentIds)
    .gte('created_at', getStartOfPeriod('month'));

  // Calculate analytics
  const analytics = calculateClassAnalytics(flashcardStats, sessionStats, studentIds);

  return NextResponse.json(analytics);
}
```

### 5.3 Analytics Dashboard Component

```typescript
// components/teacher/ClassAnalyticsDashboard.tsx

export default function ClassAnalyticsDashboard({ classId }: { classId: string }) {
  const { data: analytics } = useClassAnalytics(classId);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Class Average"
          value={`${analytics.avgQuizScore}%`}
          trend={analytics.performanceTrend}
          icon={TrendingUp}
        />
        <MetricCard
          title="Active Students"
          value={`${analytics.activeStudents}/${analytics.totalStudents}`}
          subtitle="Last 7 days"
          icon={Users}
        />
        <MetricCard
          title="Completion Rate"
          value={`${analytics.onTimeSubmissionRate}%`}
          subtitle="On-time submissions"
          icon={CheckCircle}
        />
        <MetricCard
          title="Avg Study Time"
          value={`${analytics.avgTimePerSession} min`}
          subtitle="Per session"
          icon={Clock}
        />
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Class Performance Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart
            data={analytics.weeklyPerformance}
            xKey="week"
            yKey="avgScore"
          />
        </CardContent>
      </Card>

      {/* Topic Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Performance by Topic</CardTitle>
        </CardHeader>
        <CardContent>
          <TopicHeatmap data={analytics.topicPerformance} />
        </CardContent>
      </Card>

      {/* Student Leaderboard / At-Risk */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
          </CardHeader>
          <CardContent>
            <StudentRankingList
              students={analytics.topPerformers}
              metric="score"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Needs Attention</CardTitle>
          </CardHeader>
          <CardContent>
            <AtRiskStudentList students={analytics.atRiskStudents} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

### 5.4 Export Functionality

```typescript
// app/api/classes/[classId]/analytics/export/route.ts

export async function GET(req: NextRequest, { params }) {
  const format = req.nextUrl.searchParams.get('format') || 'csv';

  const analytics = await getDetailedClassAnalytics(params.classId);

  if (format === 'csv') {
    const csv = generateCSV(analytics);
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="class-report-${params.classId}.csv"`,
      },
    });
  }

  if (format === 'pdf') {
    const pdf = await generatePDFReport(analytics);
    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="class-report-${params.classId}.pdf"`,
      },
    });
  }
}
```

---

## Phase 6: Compliance & Security (Week 6-7)

### 6.1 FERPA Compliance Checklist

| Requirement | Implementation |
|-------------|----------------|
| **Data minimization** | Only collect necessary student data |
| **Access controls** | Role-based access, audit logs |
| **Parent access** | Parent account linking (for K-12) |
| **Data export** | Student can export their data |
| **Data deletion** | Account deletion removes all data |
| **Encryption** | TLS in transit, AES-256 at rest |
| **Audit logging** | Track all data access |

### 6.2 Audit Log Table

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES user_profiles(id),

  action TEXT NOT NULL, -- 'view_student_data', 'export_report', 'modify_grade'
  resource_type TEXT NOT NULL, -- 'student', 'class', 'assignment'
  resource_id UUID,

  ip_address INET,
  user_agent TEXT,

  metadata JSONB, -- Additional context

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id, created_at);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at);
```

### 6.3 Data Retention Policies

```typescript
// lib/compliance/data-retention.ts

export async function enforceDataRetention(organizationId: string) {
  const supabase = await createClient();

  // Get org retention policy
  const { data: org } = await supabase
    .from('organizations')
    .select('data_retention_days')
    .eq('id', organizationId)
    .single();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - org.data_retention_days);

  // Delete old chat history
  await supabase
    .from('chat_history')
    .delete()
    .lt('created_at', cutoffDate.toISOString())
    .in('user_id', getOrgUserIds(organizationId));

  // Delete old study sessions
  await supabase
    .from('study_sessions')
    .delete()
    .lt('created_at', cutoffDate.toISOString())
    .in('user_id', getOrgUserIds(organizationId));

  // Log retention enforcement
  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    action: 'data_retention_enforcement',
    metadata: { cutoffDate: cutoffDate.toISOString() },
  });
}
```

---

## Phase 7: SSO Integration (Week 7-8)

### 7.1 Clerk Organization Support

Clerk has built-in organization support that can be leveraged:

```typescript
// Enable Clerk Organizations in clerk config
// clerk.com/dashboard -> Organizations -> Enable

// Middleware update to handle org context
export default clerkMiddleware(async (auth, req) => {
  const { userId, orgId, orgRole } = await auth();

  if (orgId) {
    // User is in an organization context
    // Sync with our organizations table
    await syncClerkOrganization(orgId, userId, orgRole);
  }
});
```

### 7.2 SAML SSO (Enterprise)

For districts requiring SAML SSO (Google Workspace, Azure AD, Okta):

```typescript
// Clerk Enterprise or custom SAML handler
// Store SAML config in organizations.sso_config

interface SAMLConfig {
  enabled: boolean;
  provider: 'google' | 'azure' | 'okta' | 'custom';
  entityId: string;
  ssoUrl: string;
  certificate: string;
  attributeMapping: {
    email: string;
    firstName: string;
    lastName: string;
    role?: string;
    studentId?: string;
  };
}
```

---

## Phase 8: Pilot Program Setup (Week 8-9)

### 8.1 Onboarding Flow

```typescript
// app/onboarding/institution/page.tsx

const ONBOARDING_STEPS = [
  {
    id: 'org-info',
    title: 'Organization Details',
    component: OrgInfoForm,
  },
  {
    id: 'admin-setup',
    title: 'Admin Account',
    component: AdminSetupForm,
  },
  {
    id: 'schools',
    title: 'Add Schools',
    component: SchoolSetupForm,
  },
  {
    id: 'import-teachers',
    title: 'Import Teachers',
    component: TeacherImportForm, // CSV upload or manual
  },
  {
    id: 'customize',
    title: 'Customize',
    component: BrandingForm,
  },
  {
    id: 'complete',
    title: 'Ready to Go!',
    component: OnboardingComplete,
  },
];
```

### 8.2 Bulk User Import

```typescript
// app/api/organizations/[orgId]/import-users/route.ts

export async function POST(req: NextRequest, { params }) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const role = formData.get('role') as string;

  const csvData = await file.text();
  const users = parseCSV(csvData);

  const results = {
    created: 0,
    updated: 0,
    errors: [] as string[],
  };

  for (const user of users) {
    try {
      // Create Clerk user (sends invite email)
      const clerkUser = await clerkClient.users.createUser({
        emailAddress: [user.email],
        firstName: user.firstName,
        lastName: user.lastName,
        skipPasswordRequirement: true,
      });

      // Create profile and org membership
      await createOrgMember({
        orgId: params.orgId,
        userId: clerkUser.id,
        role: role,
        schoolId: user.schoolId,
      });

      results.created++;
    } catch (error) {
      results.errors.push(`${user.email}: ${error.message}`);
    }
  }

  return NextResponse.json(results);
}
```

---

## Implementation Priority

### MVP for Pilot (4-5 weeks)

1. **Week 1-2**: Database schema + basic RBAC
2. **Week 2-3**: Teacher dashboard (classes, roster)
3. **Week 3-4**: Assignment creation + student submissions
4. **Week 4-5**: Basic analytics + CSV export

### Full Feature Set (Additional 4-5 weeks)

5. **Week 5-6**: Advanced analytics + reporting
6. **Week 6-7**: Compliance features (audit logs, retention)
7. **Week 7-8**: SSO integration
8. **Week 8-9**: Curriculum library + standards alignment

---

## Pricing Recommendation

| Tier | Price | Includes |
|------|-------|----------|
| **Pilot** | Free (90 days) | 100 students, 5 teachers, basic features |
| **Basic** | $3/student/year | 500 students, 25 teachers, analytics |
| **Professional** | $5/student/year | Unlimited, SSO, priority support |
| **Enterprise** | Custom | On-premise, custom integrations, SLA |

**Example district pricing**:
- 5,000 students × $4/student = $20,000/year
- Includes all schools, unlimited teachers, full analytics

---

## Next Steps

1. **Validate with pilot customer** - Find 1-2 schools willing to pilot
2. **Start with Phase 1-3** - Core multi-tenancy and teacher dashboard
3. **Iterate based on feedback** - Adjust feature priority
4. **Build sales materials** - Case study from pilot, ROI calculator

Would you like me to start implementing any specific phase?
