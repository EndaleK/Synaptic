-- ============================================================================
-- INSTITUTIONAL MULTI-TENANCY MIGRATION
-- ============================================================================
-- This migration adds support for institutional use (schools, districts, etc.)
-- It is ADDITIVE ONLY - no existing tables are modified
-- The existing app continues to work unchanged for individual users
-- ============================================================================

-- ============================================================================
-- ORGANIZATIONS TABLE (School Districts, Universities, Companies)
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
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
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
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
-- ORGANIZATION MEMBERS TABLE (Staff Roles)
-- Links users to organizations with specific roles
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL, -- NULL = district-wide access

  role TEXT NOT NULL CHECK (role IN (
    'org_admin',          -- Full org access (superintendent, IT admin)
    'school_admin',       -- School-level admin (principal)
    'teacher',            -- Can create classes, view own students
    'teaching_assistant', -- Limited teacher access
    'student'             -- Basic access
  )),

  title TEXT, -- "Math Teacher", "Principal", etc.
  department TEXT,

  invited_by BIGINT REFERENCES user_profiles(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(organization_id, user_id)
);

-- ============================================================================
-- CLASSES TABLE (Courses/Sections)
-- ============================================================================
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id BIGINT REFERENCES user_profiles(id) ON DELETE SET NULL,

  name TEXT NOT NULL, -- "AP Biology - Period 3"
  subject TEXT, -- "Biology", "Mathematics", etc.
  grade_level TEXT, -- "9", "10-12", "College Freshman"
  section_code TEXT, -- "BIO101-03"
  description TEXT,

  -- Enrollment
  join_code TEXT UNIQUE, -- 6-character code for students to join
  max_students INTEGER DEFAULT 35,
  allow_self_enrollment BOOLEAN DEFAULT TRUE,
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
CREATE TABLE IF NOT EXISTS class_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  enrolled_by BIGINT REFERENCES user_profiles(id), -- Teacher or self-enrolled
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dropped', 'completed')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(class_id, student_id)
);

-- ============================================================================
-- CURRICULUM RESOURCES TABLE (Shared Content Library)
-- ============================================================================
CREATE TABLE IF NOT EXISTS curriculum_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
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
  created_by BIGINT REFERENCES user_profiles(id),
  approved_by BIGINT REFERENCES user_profiles(id),
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
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_by BIGINT REFERENCES user_profiles(id),

  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  type TEXT NOT NULL CHECK (type IN ('flashcards', 'quiz', 'exam', 'reading', 'podcast', 'mindmap', 'study_guide')),

  -- Link to content
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
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
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

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
  graded_by BIGINT REFERENCES user_profiles(id),
  graded_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(assignment_id, student_id, attempt_number)
);

-- ============================================================================
-- AUDIT LOGS TABLE (Compliance/FERPA)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id BIGINT REFERENCES user_profiles(id) ON DELETE SET NULL,

  action TEXT NOT NULL, -- 'view_student_data', 'export_report', 'modify_grade'
  resource_type TEXT NOT NULL, -- 'student', 'class', 'assignment', 'submission'
  resource_id UUID,

  ip_address INET,
  user_agent TEXT,

  metadata JSONB, -- Additional context

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ORGANIZATION INVITES TABLE (For pending invitations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,

  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('org_admin', 'school_admin', 'teacher', 'teaching_assistant', 'student')),

  invite_code TEXT UNIQUE NOT NULL,
  invited_by BIGINT REFERENCES user_profiles(id),

  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by BIGINT REFERENCES user_profiles(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(organization_id, email)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe ON organizations(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_schools_org_id ON schools(organization_id);
CREATE INDEX IF NOT EXISTS idx_schools_slug ON schools(organization_id, slug);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_school ON organization_members(school_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(organization_id, role);

CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_join_code ON classes(join_code);
CREATE INDEX IF NOT EXISTS idx_classes_academic_year ON classes(school_id, academic_year);

CREATE INDEX IF NOT EXISTS idx_class_enrollments_class ON class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student ON class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_status ON class_enrollments(class_id, status);

CREATE INDEX IF NOT EXISTS idx_curriculum_org ON curriculum_resources(organization_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_school ON curriculum_resources(school_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_subject ON curriculum_resources(organization_id, subject);

CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due ON assignments(class_id, due_date);
CREATE INDEX IF NOT EXISTS idx_assignments_published ON assignments(class_id, is_published);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON assignment_submissions(assignment_id, status);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_org_invites_code ON organization_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON organization_invites(organization_id, email);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - Organizations
-- ============================================================================
-- Service role can do everything (for API routes)
CREATE POLICY "Service role full access to organizations" ON organizations
  FOR ALL USING (true) WITH CHECK (true);

-- Users can view organizations they belong to
CREATE POLICY "Members can view their organization" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
      AND is_active = true
    )
  );

-- ============================================================================
-- RLS POLICIES - Schools
-- ============================================================================
CREATE POLICY "Service role full access to schools" ON schools
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Members can view schools in their org" ON schools
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
      AND is_active = true
    )
  );

-- ============================================================================
-- RLS POLICIES - Organization Members
-- ============================================================================
CREATE POLICY "Service role full access to org members" ON organization_members
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Members can view members in their org" ON organization_members
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members om
      WHERE om.user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
      AND om.is_active = true
    )
  );

-- ============================================================================
-- RLS POLICIES - Classes
-- ============================================================================
CREATE POLICY "Service role full access to classes" ON classes
  FOR ALL USING (true) WITH CHECK (true);

-- Teachers can view/manage their own classes
CREATE POLICY "Teachers can manage their classes" ON classes
  FOR ALL USING (
    teacher_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
  );

-- Students can view classes they're enrolled in
CREATE POLICY "Students can view enrolled classes" ON classes
  FOR SELECT USING (
    id IN (
      SELECT class_id FROM class_enrollments
      WHERE student_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
      AND status = 'active'
    )
  );

-- School admins can view all classes in their school
CREATE POLICY "School admins can view school classes" ON classes
  FOR SELECT USING (
    school_id IN (
      SELECT school_id FROM organization_members
      WHERE user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
      AND role IN ('org_admin', 'school_admin')
      AND is_active = true
    )
  );

-- ============================================================================
-- RLS POLICIES - Class Enrollments
-- ============================================================================
CREATE POLICY "Service role full access to enrollments" ON class_enrollments
  FOR ALL USING (true) WITH CHECK (true);

-- Teachers can view/manage enrollments in their classes
CREATE POLICY "Teachers can manage their class enrollments" ON class_enrollments
  FOR ALL USING (
    class_id IN (
      SELECT id FROM classes
      WHERE teacher_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
    )
  );

-- Students can view their own enrollments
CREATE POLICY "Students can view own enrollments" ON class_enrollments
  FOR SELECT USING (
    student_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
  );

-- ============================================================================
-- RLS POLICIES - Assignments
-- ============================================================================
CREATE POLICY "Service role full access to assignments" ON assignments
  FOR ALL USING (true) WITH CHECK (true);

-- Teachers can manage assignments in their classes
CREATE POLICY "Teachers can manage their assignments" ON assignments
  FOR ALL USING (
    class_id IN (
      SELECT id FROM classes
      WHERE teacher_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
    )
  );

-- Students can view published assignments in their classes
CREATE POLICY "Students can view published assignments" ON assignments
  FOR SELECT USING (
    is_published = true AND
    class_id IN (
      SELECT class_id FROM class_enrollments
      WHERE student_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
      AND status = 'active'
    )
  );

-- ============================================================================
-- RLS POLICIES - Assignment Submissions
-- ============================================================================
CREATE POLICY "Service role full access to submissions" ON assignment_submissions
  FOR ALL USING (true) WITH CHECK (true);

-- Students can manage their own submissions
CREATE POLICY "Students can manage own submissions" ON assignment_submissions
  FOR ALL USING (
    student_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
  );

-- Teachers can view submissions for their assignments
CREATE POLICY "Teachers can view submissions" ON assignment_submissions
  FOR SELECT USING (
    assignment_id IN (
      SELECT a.id FROM assignments a
      JOIN classes c ON a.class_id = c.id
      WHERE c.teacher_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
    )
  );

-- Teachers can update submissions (for grading)
CREATE POLICY "Teachers can grade submissions" ON assignment_submissions
  FOR UPDATE USING (
    assignment_id IN (
      SELECT a.id FROM assignments a
      JOIN classes c ON a.class_id = c.id
      WHERE c.teacher_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
    )
  );

-- ============================================================================
-- RLS POLICIES - Curriculum Resources
-- ============================================================================
CREATE POLICY "Service role full access to curriculum" ON curriculum_resources
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Members can view org curriculum" ON curriculum_resources
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
      AND is_active = true
    )
  );

-- ============================================================================
-- RLS POLICIES - Audit Logs
-- ============================================================================
CREATE POLICY "Service role full access to audit logs" ON audit_logs
  FOR ALL USING (true) WITH CHECK (true);

-- Only org admins can view audit logs
CREATE POLICY "Org admins can view audit logs" ON audit_logs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
      AND role = 'org_admin'
      AND is_active = true
    )
  );

-- ============================================================================
-- RLS POLICIES - Organization Invites
-- ============================================================================
CREATE POLICY "Service role full access to invites" ON organization_invites
  FOR ALL USING (true) WITH CHECK (true);

-- Admins can view invites for their org
CREATE POLICY "Admins can view org invites" ON organization_invites
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
      AND role IN ('org_admin', 'school_admin')
      AND is_active = true
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at for organizations
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at for schools
CREATE TRIGGER update_schools_updated_at
  BEFORE UPDATE ON schools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at for organization_members
CREATE TRIGGER update_org_members_updated_at
  BEFORE UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at for classes
CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at for class_enrollments
CREATE TRIGGER update_class_enrollments_updated_at
  BEFORE UPDATE ON class_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at for curriculum_resources
CREATE TRIGGER update_curriculum_updated_at
  BEFORE UPDATE ON curriculum_resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at for assignments
CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at for assignment_submissions
CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON assignment_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Generate a unique 6-character join code for classes
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excluding confusing chars (0,O,1,I)
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate join code for new classes
CREATE OR REPLACE FUNCTION set_class_join_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  IF NEW.join_code IS NULL THEN
    LOOP
      new_code := generate_join_code();
      SELECT EXISTS(SELECT 1 FROM classes WHERE join_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    NEW.join_code := new_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_class_join_code_trigger
  BEFORE INSERT ON classes
  FOR EACH ROW EXECUTE FUNCTION set_class_join_code();

-- Function to update organization seat count
CREATE OR REPLACE FUNCTION update_org_seat_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE organizations
    SET current_seats = current_seats + 1
    WHERE id = NEW.organization_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE organizations
    SET current_seats = current_seats - 1
    WHERE id = OLD.organization_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_org_seats_on_member_change
  AFTER INSERT OR DELETE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION update_org_seat_count();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE organizations IS 'School districts, universities, or corporate organizations using Synaptic institutionally';
COMMENT ON TABLE schools IS 'Individual schools within an organization (district)';
COMMENT ON TABLE organization_members IS 'Links users to organizations with specific roles (admin, teacher, student)';
COMMENT ON TABLE classes IS 'Courses or sections taught by teachers, with join codes for student enrollment';
COMMENT ON TABLE class_enrollments IS 'Student enrollment in classes';
COMMENT ON TABLE curriculum_resources IS 'Shared document library within an organization';
COMMENT ON TABLE assignments IS 'Teacher-created tasks linked to documents/exams with due dates';
COMMENT ON TABLE assignment_submissions IS 'Student progress and submissions for assignments';
COMMENT ON TABLE audit_logs IS 'Compliance logging for FERPA and data access tracking';
COMMENT ON TABLE organization_invites IS 'Pending invitations for users to join an organization';
