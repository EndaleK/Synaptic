-- ============================================================================
-- HOMESCHOOL FEATURES MIGRATION
-- ============================================================================
-- This migration adds support for homeschooling features:
-- 1. Parent/guardian role and student-guardian relationships
-- 2. Curriculum unit tracking
-- 3. Progress reports for compliance
--
-- It is ADDITIVE ONLY - no existing tables are modified destructively
-- ============================================================================

-- ============================================================================
-- UPDATE ORGANIZATION MEMBERS ROLE CHECK
-- Add 'parent' role to the allowed roles
-- ============================================================================
ALTER TABLE organization_members
DROP CONSTRAINT IF EXISTS organization_members_role_check;

ALTER TABLE organization_members
ADD CONSTRAINT organization_members_role_check
CHECK (role IN (
  'org_admin',
  'school_admin',
  'teacher',
  'teaching_assistant',
  'parent',
  'student'
));

-- Update organization_invites to allow parent role
ALTER TABLE organization_invites
DROP CONSTRAINT IF EXISTS organization_invites_role_check;

ALTER TABLE organization_invites
ADD CONSTRAINT organization_invites_role_check
CHECK (role IN (
  'org_admin',
  'school_admin',
  'teacher',
  'teaching_assistant',
  'parent',
  'student'
));

-- ============================================================================
-- STUDENT GUARDIANS TABLE
-- Links parents/guardians to students they can monitor
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_guardians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  parent_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Relationship details
  relationship TEXT NOT NULL CHECK (relationship IN (
    'mother', 'father', 'guardian', 'grandparent', 'other'
  )),

  -- Permission level for the guardian
  permission_level TEXT NOT NULL DEFAULT 'view_only' CHECK (permission_level IN (
    'view_only',    -- Can view progress and assignments
    'view_grades',  -- Can also view detailed grades
    'full_access'   -- Can view everything including notes
  )),

  -- Optional: Link to organization (for homeschool co-ops)
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- Verification status
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by BIGINT REFERENCES user_profiles(id),

  -- Request tracking
  requested_by BIGINT REFERENCES user_profiles(id), -- Who requested the link
  request_note TEXT, -- Optional note from requester

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(student_id, parent_id)
);

-- ============================================================================
-- CURRICULUM UNITS TABLE
-- Track curriculum units/chapters for year-long progress monitoring
-- ============================================================================
CREATE TABLE IF NOT EXISTS curriculum_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,

  -- Unit details
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT, -- "Math", "Science", "Language Arts"

  -- Standards alignment
  standards JSONB DEFAULT '[]'::jsonb, -- [{"code": "CCSS.MATH.3.A.1", "description": "..."}]

  -- Schedule
  start_date DATE,
  end_date DATE,

  -- Ordering
  order_index INTEGER NOT NULL DEFAULT 0,

  -- Resource links
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  resource_ids UUID[] DEFAULT '{}', -- Multiple resources per unit

  -- Settings
  is_required BOOLEAN DEFAULT TRUE,
  estimated_hours INTEGER, -- Estimated hours to complete

  created_by BIGINT REFERENCES user_profiles(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STUDENT UNIT PROGRESS TABLE
-- Track individual student progress through curriculum units
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_unit_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,

  -- Progress tracking
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN (
    'not_started',
    'in_progress',
    'completed',
    'reviewed'  -- After teacher/parent review
  )),

  mastery_percent INTEGER DEFAULT 0 CHECK (mastery_percent >= 0 AND mastery_percent <= 100),

  -- Time tracking
  time_spent_minutes INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Related progress
  flashcards_mastered INTEGER DEFAULT 0,
  flashcards_total INTEGER DEFAULT 0,
  assignments_completed INTEGER DEFAULT 0,
  assignments_total INTEGER DEFAULT 0,

  -- Notes
  student_notes TEXT,
  teacher_notes TEXT,

  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(student_id, unit_id)
);

-- ============================================================================
-- PROGRESS REPORTS TABLE
-- Store generated progress reports for compliance
-- ============================================================================
CREATE TABLE IF NOT EXISTS progress_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Who this report is for
  student_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- Report metadata
  title TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN (
    'monthly', 'quarterly', 'semester', 'annual', 'custom'
  )),

  -- Period covered
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Report content (JSON blob for flexibility)
  report_data JSONB NOT NULL,
  -- Structure:
  -- {
  --   "student": {"name": "...", "id": "..."},
  --   "period": {"start": "...", "end": "...", "type": "..."},
  --   "attendance": {"totalDays": N, "activeDays": N, "attendanceRate": N},
  --   "subjects": [{"name": "Math", "units_completed": N, "mastery_avg": N, ...}],
  --   "flashcards": {"totalReviewed": N, "accuracy": N, "mastered": N, "learning": N},
  --   "studyTime": {"totalMinutes": N, "averageDailyMinutes": N, "byMode": {...}},
  --   "assignments": {"completed": N, "total": N, "averageScore": N, "onTimeRate": N},
  --   "streaks": {"current": N, "longest": N}
  -- }

  -- PDF storage
  pdf_url TEXT,
  pdf_storage_path TEXT,

  -- State compliance
  state_code TEXT, -- "CA", "TX", "NY", etc.
  compliance_template TEXT, -- Template used for state requirements

  -- Generated by
  generated_by BIGINT REFERENCES user_profiles(id),
  generation_source TEXT DEFAULT 'manual' CHECK (generation_source IN (
    'manual', 'scheduled', 'api'
  )),

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'finalized', 'submitted', 'archived'
  )),
  finalized_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE, -- For state submission tracking

  -- Sharing
  shared_with_guardians BOOLEAN DEFAULT FALSE,
  shared_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STATE COMPLIANCE TEMPLATES TABLE
-- Store templates for different state requirements
-- ============================================================================
CREATE TABLE IF NOT EXISTS state_compliance_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  state_code TEXT NOT NULL, -- "CA", "TX", "NY"
  state_name TEXT NOT NULL, -- "California", "Texas", "New York"

  -- Requirement level
  requirement_level TEXT NOT NULL CHECK (requirement_level IN (
    'none',     -- No homeschool regulations
    'low',      -- Notification only
    'moderate', -- Testing/portfolio required
    'high'      -- Detailed oversight required
  )),

  -- Requirements
  requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Structure:
  -- {
  --   "notification": {"required": true, "frequency": "annual", "deadline": "Sep 1"},
  --   "curriculum": {"approval_required": false, "subjects_required": ["Math", "English", "Science"]},
  --   "attendance": {"tracking_required": true, "min_days": 180, "min_hours": 900},
  --   "assessment": {"type": "standardized_test", "frequency": "annual", "grades": ["3", "5", "8"]},
  --   "portfolio": {"required": true, "contents": ["work_samples", "attendance_log", "curriculum_plan"]},
  --   "reporting": {"frequency": "quarterly", "to": "school_district"},
  --   "teacher_qualifications": {"required": false, "details": null}
  -- }

  -- Helpful links
  official_website TEXT,
  resource_links JSONB DEFAULT '[]'::jsonb, -- [{title, url}]

  -- Notes
  notes TEXT,
  last_verified DATE, -- When requirements were last verified

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(state_code)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_student_guardians_student ON student_guardians(student_id);
CREATE INDEX IF NOT EXISTS idx_student_guardians_parent ON student_guardians(parent_id);
CREATE INDEX IF NOT EXISTS idx_student_guardians_org ON student_guardians(organization_id);
CREATE INDEX IF NOT EXISTS idx_student_guardians_active ON student_guardians(student_id, is_active);

CREATE INDEX IF NOT EXISTS idx_curriculum_units_class ON curriculum_units(class_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_units_order ON curriculum_units(class_id, order_index);
CREATE INDEX IF NOT EXISTS idx_curriculum_units_subject ON curriculum_units(class_id, subject);

CREATE INDEX IF NOT EXISTS idx_student_unit_progress_student ON student_unit_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_unit_progress_unit ON student_unit_progress(unit_id);
CREATE INDEX IF NOT EXISTS idx_student_unit_progress_status ON student_unit_progress(student_id, status);

CREATE INDEX IF NOT EXISTS idx_progress_reports_student ON progress_reports(student_id);
CREATE INDEX IF NOT EXISTS idx_progress_reports_class ON progress_reports(class_id);
CREATE INDEX IF NOT EXISTS idx_progress_reports_org ON progress_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_progress_reports_period ON progress_reports(student_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_progress_reports_status ON progress_reports(student_id, status);

CREATE INDEX IF NOT EXISTS idx_state_templates_state ON state_compliance_templates(state_code);
CREATE INDEX IF NOT EXISTS idx_state_templates_level ON state_compliance_templates(requirement_level);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE student_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_unit_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_compliance_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - Student Guardians
-- ============================================================================
CREATE POLICY "Service role full access to student_guardians" ON student_guardians
  FOR ALL USING (true) WITH CHECK (true);

-- Parents can view their own guardian relationships
CREATE POLICY "Parents can view own guardian links" ON student_guardians
  FOR SELECT USING (
    parent_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
  );

-- Students can view who has guardian access to them
CREATE POLICY "Students can view own guardians" ON student_guardians
  FOR SELECT USING (
    student_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
  );

-- Org admins can manage guardians in their org
CREATE POLICY "Org admins can manage guardians" ON student_guardians
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
      AND role = 'org_admin'
      AND is_active = true
    )
  );

-- ============================================================================
-- RLS POLICIES - Curriculum Units
-- ============================================================================
CREATE POLICY "Service role full access to curriculum_units" ON curriculum_units
  FOR ALL USING (true) WITH CHECK (true);

-- Teachers can manage units in their classes
CREATE POLICY "Teachers can manage class units" ON curriculum_units
  FOR ALL USING (
    class_id IN (
      SELECT id FROM classes
      WHERE teacher_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
    )
  );

-- Students can view units in their enrolled classes
CREATE POLICY "Students can view enrolled class units" ON curriculum_units
  FOR SELECT USING (
    class_id IN (
      SELECT class_id FROM class_enrollments
      WHERE student_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
      AND status = 'active'
    )
  );

-- Parents can view units for their linked students
CREATE POLICY "Parents can view linked student units" ON curriculum_units
  FOR SELECT USING (
    class_id IN (
      SELECT c.id FROM classes c
      JOIN class_enrollments ce ON ce.class_id = c.id
      JOIN student_guardians sg ON sg.student_id = ce.student_id
      WHERE sg.parent_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
      AND sg.is_active = true
      AND ce.status = 'active'
    )
  );

-- ============================================================================
-- RLS POLICIES - Student Unit Progress
-- ============================================================================
CREATE POLICY "Service role full access to student_unit_progress" ON student_unit_progress
  FOR ALL USING (true) WITH CHECK (true);

-- Students can view/update their own progress
CREATE POLICY "Students can manage own unit progress" ON student_unit_progress
  FOR ALL USING (
    student_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
  );

-- Teachers can view progress for students in their classes
CREATE POLICY "Teachers can view class student progress" ON student_unit_progress
  FOR SELECT USING (
    unit_id IN (
      SELECT cu.id FROM curriculum_units cu
      JOIN classes c ON c.id = cu.class_id
      WHERE c.teacher_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
    )
  );

-- Parents can view progress for their linked students
CREATE POLICY "Parents can view linked student progress" ON student_unit_progress
  FOR SELECT USING (
    student_id IN (
      SELECT student_id FROM student_guardians
      WHERE parent_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
      AND is_active = true
    )
  );

-- ============================================================================
-- RLS POLICIES - Progress Reports
-- ============================================================================
CREATE POLICY "Service role full access to progress_reports" ON progress_reports
  FOR ALL USING (true) WITH CHECK (true);

-- Teachers can manage reports for their students
CREATE POLICY "Teachers can manage student reports" ON progress_reports
  FOR ALL USING (
    student_id IN (
      SELECT ce.student_id FROM class_enrollments ce
      JOIN classes c ON c.id = ce.class_id
      WHERE c.teacher_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
    )
    OR
    generated_by IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
  );

-- Students can view their own reports
CREATE POLICY "Students can view own reports" ON progress_reports
  FOR SELECT USING (
    student_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
  );

-- Parents can view reports for linked students (if shared)
CREATE POLICY "Parents can view shared reports" ON progress_reports
  FOR SELECT USING (
    shared_with_guardians = true
    AND student_id IN (
      SELECT student_id FROM student_guardians
      WHERE parent_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
      AND is_active = true
    )
  );

-- Org admins can view all reports in their org
CREATE POLICY "Org admins can view org reports" ON progress_reports
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id IN (SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub')
      AND role = 'org_admin'
      AND is_active = true
    )
  );

-- ============================================================================
-- RLS POLICIES - State Compliance Templates (Public Read)
-- ============================================================================
CREATE POLICY "Service role full access to state_templates" ON state_compliance_templates
  FOR ALL USING (true) WITH CHECK (true);

-- Anyone can read active templates
CREATE POLICY "Anyone can view active templates" ON state_compliance_templates
  FOR SELECT USING (is_active = true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at for student_guardians
CREATE TRIGGER update_student_guardians_updated_at
  BEFORE UPDATE ON student_guardians
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at for curriculum_units
CREATE TRIGGER update_curriculum_units_updated_at
  BEFORE UPDATE ON curriculum_units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at for student_unit_progress
CREATE TRIGGER update_student_unit_progress_updated_at
  BEFORE UPDATE ON student_unit_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at for progress_reports
CREATE TRIGGER update_progress_reports_updated_at
  BEFORE UPDATE ON progress_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at for state_compliance_templates
CREATE TRIGGER update_state_templates_updated_at
  BEFORE UPDATE ON state_compliance_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA - State Compliance Templates
-- ============================================================================
INSERT INTO state_compliance_templates (state_code, state_name, requirement_level, requirements, notes) VALUES
-- No/Low Regulation States
('TX', 'Texas', 'none', '{
  "notification": {"required": false},
  "curriculum": {"approval_required": false},
  "attendance": {"tracking_required": false},
  "assessment": {"required": false},
  "portfolio": {"required": false},
  "reporting": {"required": false}
}'::jsonb, 'Texas has no homeschool regulations. Families operate as private schools.'),

('AK', 'Alaska', 'none', '{
  "notification": {"required": false},
  "curriculum": {"approval_required": false},
  "attendance": {"tracking_required": false},
  "assessment": {"required": false},
  "portfolio": {"required": false},
  "reporting": {"required": false}
}'::jsonb, 'Alaska has minimal homeschool oversight.'),

('ID', 'Idaho', 'none', '{
  "notification": {"required": false},
  "curriculum": {"approval_required": false, "subjects_required": ["language arts", "math", "science", "social studies"]},
  "attendance": {"tracking_required": false},
  "assessment": {"required": false},
  "portfolio": {"required": false},
  "reporting": {"required": false}
}'::jsonb, 'Idaho requires instruction in specified subjects but no reporting.'),

-- Moderate Regulation States
('CA', 'California', 'moderate', '{
  "notification": {"required": true, "frequency": "annual", "form": "Private School Affidavit"},
  "curriculum": {"approval_required": false, "subjects_required": ["english", "math", "social science", "science", "visual arts", "health", "physical education"]},
  "attendance": {"tracking_required": true, "min_days": 175},
  "assessment": {"required": false},
  "portfolio": {"required": false},
  "reporting": {"required": false}
}'::jsonb, 'California homeschools can operate as private schools via PSA filing.'),

('FL', 'Florida', 'moderate', '{
  "notification": {"required": true, "frequency": "annual", "to": "school_district"},
  "curriculum": {"approval_required": false},
  "attendance": {"tracking_required": true},
  "assessment": {"type": "annual_evaluation", "options": ["standardized_test", "teacher_evaluation", "portfolio_review"]},
  "portfolio": {"required": true, "retention": "2_years"},
  "reporting": {"required": true, "frequency": "annual"}
}'::jsonb, 'Florida requires annual notification and evaluation.'),

-- High Regulation States
('NY', 'New York', 'high', '{
  "notification": {"required": true, "frequency": "annual", "deadline": "July 1"},
  "curriculum": {"approval_required": true, "subjects_required": ["math", "science", "english", "social studies", "art", "music", "health", "physical education"], "ihip_required": true},
  "attendance": {"tracking_required": true, "min_hours": 900, "min_hours_7_12": 990},
  "assessment": {"type": "standardized_test", "frequency": "annual_grades_4_8", "alternative": "portfolio_review"},
  "portfolio": {"required": false},
  "reporting": {"required": true, "frequency": "quarterly"}
}'::jsonb, 'New York requires IHIP submission, quarterly reports, and annual assessment.'),

('PA', 'Pennsylvania', 'high', '{
  "notification": {"required": true, "frequency": "annual", "notarized_affidavit": true},
  "curriculum": {"approval_required": false, "subjects_required": ["english", "math", "science", "social studies", "art", "music", "health", "physical education", "safety"]},
  "attendance": {"tracking_required": true, "min_days": 180, "min_hours": 900, "min_hours_secondary": 990},
  "assessment": {"type": "standardized_test", "grades": ["3", "5", "8"], "alternative": "certified_teacher_evaluation"},
  "portfolio": {"required": true, "contents": ["log", "samples", "standardized_test_results"]},
  "reporting": {"required": true, "to": "school_district", "annual_evaluation": true}
}'::jsonb, 'Pennsylvania requires notarized affidavit, portfolio, and annual evaluation.'),

('MA', 'Massachusetts', 'high', '{
  "notification": {"required": true, "frequency": "annual", "prior_approval": true},
  "curriculum": {"approval_required": true, "subjects_required": ["reading", "writing", "english", "math", "science", "history", "geography", "good_citizenship"]},
  "attendance": {"tracking_required": true},
  "assessment": {"type": "varies_by_district", "options": ["standardized_test", "progress_report", "portfolio_review"]},
  "portfolio": {"required": false},
  "reporting": {"required": true, "frequency": "varies_by_district"}
}'::jsonb, 'Massachusetts requires prior approval and varies by school district.')

ON CONFLICT (state_code) DO UPDATE SET
  requirements = EXCLUDED.requirements,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE student_guardians IS 'Links parents/guardians to students for progress monitoring (homeschool feature)';
COMMENT ON TABLE curriculum_units IS 'Curriculum units/chapters for tracking year-long progress in classes';
COMMENT ON TABLE student_unit_progress IS 'Individual student progress through curriculum units';
COMMENT ON TABLE progress_reports IS 'Generated progress reports for compliance and parent monitoring';
COMMENT ON TABLE state_compliance_templates IS 'Templates for different state homeschool requirements';

COMMENT ON COLUMN student_guardians.permission_level IS 'Controls what data the guardian can access: view_only (progress), view_grades (+ detailed grades), full_access (everything)';
COMMENT ON COLUMN curriculum_units.standards IS 'JSON array of educational standards this unit aligns with (e.g., Common Core)';
COMMENT ON COLUMN progress_reports.report_data IS 'JSON blob containing all report data for flexibility in report generation';
COMMENT ON COLUMN state_compliance_templates.requirements IS 'JSON object detailing state-specific homeschool requirements';
