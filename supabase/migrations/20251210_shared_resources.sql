-- Migration: Shared Resources for Curriculum Distribution
-- This enables school boards, co-ops, and organizations to share curriculum materials
-- with enrolled families, who can then generate flashcards, podcasts, etc.

-- Shared Resources Table
-- Stores curriculum materials uploaded by org admins
CREATE TABLE IF NOT EXISTS shared_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  resource_type VARCHAR(50) NOT NULL DEFAULT 'document', -- 'document', 'textbook', 'workbook', 'video', 'url'
  subject VARCHAR(100),
  grade_levels INT[] DEFAULT '{}', -- Array of grades e.g., {5, 6, 7}

  -- Link to existing document if uploaded
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  -- Or external URL
  external_url TEXT,

  -- Visibility controls
  visibility VARCHAR(50) NOT NULL DEFAULT 'all_members', -- 'all_members', 'specific_schools', 'specific_classes'
  visible_to_schools UUID[] DEFAULT '{}', -- School IDs if visibility = 'specific_schools'
  visible_to_classes UUID[] DEFAULT '{}', -- Class IDs if visibility = 'specific_classes'

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  curriculum_standards JSONB DEFAULT '{}', -- e.g., {"Alberta": ["LA.5.1", "MA.5.2"]}
  estimated_hours DECIMAL(5,2),

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Audit fields
  created_by BIGINT REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_shared_resources_org ON shared_resources(organization_id);
CREATE INDEX IF NOT EXISTS idx_shared_resources_visibility ON shared_resources(visibility);
CREATE INDEX IF NOT EXISTS idx_shared_resources_subject ON shared_resources(subject);
CREATE INDEX IF NOT EXISTS idx_shared_resources_active ON shared_resources(is_active);

-- Resource Usage Tracking
-- Tracks which families have accessed/used resources
CREATE TABLE IF NOT EXISTS resource_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL REFERENCES shared_resources(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  student_id BIGINT REFERENCES user_profiles(id) ON DELETE SET NULL, -- If tracking for a specific student

  -- Action tracking
  action VARCHAR(50) NOT NULL, -- 'viewed', 'downloaded', 'generated_flashcards', 'generated_podcast', 'generated_mindmap', 'completed'

  -- Link to generated content
  -- Note: documents.id is UUID, mindmaps.id is UUID, but podcasts.id is BIGINT in production
  flashcard_set_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  podcast_id BIGINT REFERENCES podcasts(id) ON DELETE SET NULL,
  mindmap_id UUID REFERENCES mindmaps(id) ON DELETE SET NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_resource_usage_resource ON resource_usage(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_usage_user ON resource_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_usage_action ON resource_usage(action);

-- Resource Assignments
-- Links shared resources to curriculum units and assignments
CREATE TABLE IF NOT EXISTS resource_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL REFERENCES shared_resources(id) ON DELETE CASCADE,
  curriculum_unit_id UUID REFERENCES curriculum_units(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,

  -- Order within unit/assignment
  order_index INT DEFAULT 0,

  -- Optional notes for teachers
  teacher_notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resource_assignments_resource ON resource_assignments(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_assignments_unit ON resource_assignments(curriculum_unit_id);

-- View for easy resource access checking
CREATE OR REPLACE VIEW accessible_resources AS
SELECT
  sr.*,
  o.name as organization_name,
  d.file_name as document_name,
  d.file_type as document_type,
  up.full_name as created_by_name
FROM shared_resources sr
LEFT JOIN organizations o ON sr.organization_id = o.id
LEFT JOIN documents d ON sr.document_id = d.id
LEFT JOIN user_profiles up ON sr.created_by = up.id
WHERE sr.is_active = true;

-- Function to check if a user can access a resource
CREATE OR REPLACE FUNCTION can_access_resource(
  p_user_id BIGINT,
  p_resource_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_resource shared_resources%ROWTYPE;
  v_user_org_id UUID;
  v_user_school_ids UUID[];
  v_user_class_ids UUID[];
BEGIN
  -- Get the resource
  SELECT * INTO v_resource FROM shared_resources WHERE id = p_resource_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Check if user is in the organization
  SELECT organization_id INTO v_user_org_id
  FROM organization_members
  WHERE user_id = p_user_id
    AND organization_id = v_resource.organization_id
    AND is_active = true
  LIMIT 1;

  IF v_user_org_id IS NULL THEN
    -- Also check if user is enrolled in a class under this org
    SELECT DISTINCT c.organization_id INTO v_user_org_id
    FROM class_enrollments ce
    JOIN classes c ON ce.class_id = c.id
    WHERE ce.student_id = p_user_id
      AND c.organization_id = v_resource.organization_id
      AND ce.status = 'active'
    LIMIT 1;
  END IF;

  IF v_user_org_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check visibility
  IF v_resource.visibility = 'all_members' THEN
    RETURN TRUE;
  ELSIF v_resource.visibility = 'specific_schools' THEN
    -- Get user's school memberships (from organization_members table)
    SELECT ARRAY_AGG(school_id) INTO v_user_school_ids
    FROM organization_members
    WHERE user_id = p_user_id AND is_active = true AND school_id IS NOT NULL;

    RETURN v_user_school_ids && v_resource.visible_to_schools;
  ELSIF v_resource.visibility = 'specific_classes' THEN
    -- Get user's class enrollments
    SELECT ARRAY_AGG(class_id) INTO v_user_class_ids
    FROM class_enrollments
    WHERE student_id = p_user_id AND status = 'active';

    RETURN v_user_class_ids && v_resource.visible_to_classes;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for shared_resources
ALTER TABLE shared_resources ENABLE ROW LEVEL SECURITY;

-- Service role bypass for API operations
CREATE POLICY shared_resources_service_role ON shared_resources
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Org admins can manage their org's resources
CREATE POLICY shared_resources_admin_policy ON shared_resources
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN user_profiles up ON up.id = om.user_id
      WHERE up.clerk_user_id = auth.jwt()->>'sub'
        AND om.organization_id = shared_resources.organization_id
        AND om.role IN ('org_admin', 'school_admin')
        AND om.is_active = true
    )
  );

-- Members can view resources they have access to
CREATE POLICY shared_resources_view_policy ON shared_resources
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.clerk_user_id = auth.jwt()->>'sub'
        AND can_access_resource(up.id, shared_resources.id)
    )
  );

-- RLS for resource_usage
ALTER TABLE resource_usage ENABLE ROW LEVEL SECURITY;

-- Service role bypass
CREATE POLICY resource_usage_service_role ON resource_usage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can manage their own usage
CREATE POLICY resource_usage_own_policy ON resource_usage
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.clerk_user_id = auth.jwt()->>'sub'
        AND up.id = resource_usage.user_id
    )
  );

-- Org admins can see all usage for their resources
CREATE POLICY resource_usage_admin_policy ON resource_usage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shared_resources sr
      JOIN organization_members om ON om.organization_id = sr.organization_id
      JOIN user_profiles up ON up.id = om.user_id
      WHERE sr.id = resource_usage.resource_id
        AND up.clerk_user_id = auth.jwt()->>'sub'
        AND om.role IN ('org_admin', 'school_admin')
        AND om.is_active = true
    )
  );

-- RLS for resource_assignments
ALTER TABLE resource_assignments ENABLE ROW LEVEL SECURITY;

-- Service role bypass
CREATE POLICY resource_assignments_service_role ON resource_assignments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Update trigger for shared_resources
CREATE OR REPLACE FUNCTION update_shared_resources_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shared_resources_updated ON shared_resources;
CREATE TRIGGER shared_resources_updated
  BEFORE UPDATE ON shared_resources
  FOR EACH ROW
  EXECUTE FUNCTION update_shared_resources_timestamp();

-- Comments for documentation
COMMENT ON TABLE shared_resources IS 'Curriculum materials shared by organizations with enrolled families';
COMMENT ON TABLE resource_usage IS 'Tracks how families interact with shared resources';
COMMENT ON TABLE resource_assignments IS 'Links shared resources to curriculum units and assignments';
COMMENT ON FUNCTION can_access_resource IS 'Checks if a user can access a specific shared resource based on visibility settings';
