-- ============================================================================
-- CANADIAN JURISDICTION REQUIREMENTS MIGRATION
-- ============================================================================
-- This migration extends the compliance system to support:
-- 1. Canadian provinces (with Alberta as primary focus)
-- 2. Unified jurisdiction_requirements table (replacing state_compliance_templates)
-- 3. User profile jurisdiction field
--
-- It is ADDITIVE ONLY - no existing tables are modified destructively
-- ============================================================================

-- ============================================================================
-- RENAME state_compliance_templates TO jurisdiction_requirements
-- Add country and jurisdiction_type columns
-- ============================================================================

-- Add new columns to existing table
ALTER TABLE state_compliance_templates
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US',
ADD COLUMN IF NOT EXISTS jurisdiction_type TEXT DEFAULT 'state';

-- Add check constraint for country
ALTER TABLE state_compliance_templates
DROP CONSTRAINT IF EXISTS state_compliance_templates_country_check;

ALTER TABLE state_compliance_templates
ADD CONSTRAINT state_compliance_templates_country_check
CHECK (country IN ('US', 'CA'));

-- Add check constraint for jurisdiction_type
ALTER TABLE state_compliance_templates
DROP CONSTRAINT IF EXISTS state_compliance_templates_jurisdiction_type_check;

ALTER TABLE state_compliance_templates
ADD CONSTRAINT state_compliance_templates_jurisdiction_type_check
CHECK (jurisdiction_type IN ('state', 'province', 'territory'));

-- Update existing US records to have explicit country
UPDATE state_compliance_templates
SET country = 'US', jurisdiction_type = 'state'
WHERE country IS NULL;

-- ============================================================================
-- INSERT CANADIAN PROVINCE DATA
-- Primary focus: Alberta (Edmonton launch market)
-- ============================================================================

INSERT INTO state_compliance_templates (
  state_code,
  state_name,
  country,
  jurisdiction_type,
  requirement_level,
  requirements,
  official_website,
  resource_links,
  notes
) VALUES

-- ============================================================================
-- ALBERTA (PRIMARY MARKET - EDMONTON)
-- ============================================================================
('AB', 'Alberta', 'CA', 'province', 'moderate', '{
  "notification": {
    "required": true,
    "frequency": "annual",
    "deadline": "September 30",
    "to": "supervising_school_board",
    "form": "Notice of Intent"
  },
  "curriculum": {
    "approval_required": false,
    "subjects_required": ["Language Arts", "Mathematics", "Science", "Social Studies"],
    "programs_of_study_alignment": true,
    "education_plan_required": true,
    "education_plan_contents": ["activities", "resources", "evaluation_methods", "instruction_methods"]
  },
  "attendance": {
    "tracking_required": true,
    "type": "hours_based"
  },
  "assessment": {
    "required": true,
    "frequency": "semi_annual",
    "assessments_per_year": 2,
    "conducted_by": "supervising_teacher",
    "provincial_exams": {
      "available": true,
      "optional": true,
      "grades": [3, 6, 9]
    }
  },
  "portfolio": {
    "required": false,
    "recommended": true
  },
  "reporting": {
    "required": true,
    "frequency": "semi_annual",
    "to": "supervising_school_board"
  },
  "funding": {
    "available": true,
    "amount_per_student": 901,
    "kindergarten_amount": 450.50,
    "currency": "CAD",
    "requires_supervision": true,
    "fiscal_year": "2024-2025"
  },
  "options": {
    "supervised": {
      "funding": true,
      "school_board_oversight": true,
      "teacher_assessments": true
    },
    "notification_only": {
      "funding": false,
      "school_board_oversight": false,
      "teacher_assessments": false
    }
  }
}'::jsonb,
'https://www.alberta.ca/home-education',
'[
  {"title": "Alberta Home Education Regulation", "url": "https://open.alberta.ca/publications/2019_089"},
  {"title": "HSLDA Canada - Alberta", "url": "https://hslda.org/post/canada"},
  {"title": "Alberta Homeschooling Association", "url": "https://www.albertahomeschooling.ca/"},
  {"title": "The Canadian Homeschooler - Alberta Laws", "url": "https://thecanadianhomeschooler.com/canadian-homeschool-laws-alberta/"},
  {"title": "THEE Home Education Funding", "url": "https://thee.ca/how-it-works/home-school-funding/"}
]'::jsonb,
'Alberta provides $901/year funding per student (grades 1-12) for supervised home education programs. Registration deadline is September 30. Two assessments per year required by supervising teacher. Provincial Achievement Tests available but optional at grades 3, 6, and 9.'),

-- ============================================================================
-- BRITISH COLUMBIA
-- ============================================================================
('BC', 'British Columbia', 'CA', 'province', 'low', '{
  "notification": {
    "required": true,
    "frequency": "annual",
    "deadline": "September 30",
    "to": "school_district_or_independent_school"
  },
  "curriculum": {
    "approval_required": false,
    "subjects_required": [],
    "note": "No curriculum requirements for traditional homeschool"
  },
  "attendance": {
    "tracking_required": false
  },
  "assessment": {
    "required": false,
    "note": "No assessment required for traditional homeschool"
  },
  "portfolio": {
    "required": false
  },
  "reporting": {
    "required": false,
    "note": "No reporting required for traditional homeschool"
  },
  "funding": {
    "available": false,
    "note": "No funding for traditional homeschool. Distributed Learning option provides funding but requires certified teacher oversight."
  },
  "options": {
    "traditional_homeschool": {
      "funding": false,
      "oversight": false,
      "requirements": "registration_only"
    },
    "distributed_learning": {
      "funding": true,
      "oversight": true,
      "requires_certified_teacher": true
    }
  }
}'::jsonb,
'https://www2.gov.bc.ca/gov/content/education-training/k-12/administration/legislation-policy/independent-schools/homeschooling',
'[
  {"title": "BC Homeschooling Policy", "url": "https://www2.gov.bc.ca/gov/content/education-training/k-12/administration/legislation-policy/independent-schools/homeschooling"},
  {"title": "HSLDA Canada", "url": "https://hslda.org/post/canada"}
]'::jsonb,
'British Columbia has two options: Traditional homeschool (registration only, no funding, no requirements) or Distributed Learning (funded, requires certified teacher oversight).'),

-- ============================================================================
-- ONTARIO
-- ============================================================================
('ON', 'Ontario', 'CA', 'province', 'none', '{
  "notification": {
    "required": false,
    "note": "No notification required unless withdrawing from public school"
  },
  "curriculum": {
    "approval_required": false,
    "subjects_required": []
  },
  "attendance": {
    "tracking_required": false
  },
  "assessment": {
    "required": false
  },
  "portfolio": {
    "required": false
  },
  "reporting": {
    "required": false
  },
  "funding": {
    "available": false
  }
}'::jsonb,
'https://www.ontario.ca/page/home-schooling-your-child',
'[
  {"title": "Ontario Home Schooling Guide", "url": "https://www.ontario.ca/page/home-schooling-your-child"},
  {"title": "HSLDA Canada", "url": "https://hslda.org/post/canada"}
]'::jsonb,
'Ontario has no legal requirements for homeschooling. Notification is optional. No curriculum, assessment, or reporting requirements.'),

-- ============================================================================
-- QUEBEC
-- ============================================================================
('QC', 'Quebec', 'CA', 'province', 'high', '{
  "notification": {
    "required": true,
    "frequency": "annual",
    "deadline": "July 1",
    "to": "minister_of_education_and_school_board",
    "within_10_days": "if decision made after July 1"
  },
  "curriculum": {
    "approval_required": false,
    "learning_project_required": true,
    "learning_project_deadline": "September 30 or 30 days after deciding to homeschool"
  },
  "attendance": {
    "tracking_required": false
  },
  "assessment": {
    "required": true,
    "type": "end_of_year_evaluation",
    "options": ["certified_teacher", "private_school", "school_centre", "exam", "portfolio"]
  },
  "portfolio": {
    "required": false,
    "accepted_as_evaluation": true
  },
  "reporting": {
    "required": true,
    "frequency": "multiple",
    "reports": [
      {"name": "Learning Project", "deadline": "September 30"},
      {"name": "Mid-Term Report", "deadline": "mid_year"},
      {"name": "End of Term Report", "deadline": "June 15"}
    ],
    "monitor_meetings": true
  },
  "funding": {
    "available": false
  }
}'::jsonb,
'https://www.quebec.ca/en/education/preschool-elementary-and-secondary-schools/home-schooling',
'[
  {"title": "Quebec Home Education", "url": "https://www.quebec.ca/en/education/preschool-elementary-and-secondary-schools/home-schooling"},
  {"title": "HSLDA Canada", "url": "https://hslda.org/post/canada"}
]'::jsonb,
'Quebec has the highest regulation in Canada. Requires notice by July 1, learning project by September 30, mid-year report, end-of-year report by June 15, monitor meetings, and final evaluation.'),

-- ============================================================================
-- SASKATCHEWAN
-- ============================================================================
('SK', 'Saskatchewan', 'CA', 'province', 'low', '{
  "notification": {
    "required": true,
    "frequency": "annual",
    "to": "school_division"
  },
  "curriculum": {
    "approval_required": false,
    "subjects_required": []
  },
  "attendance": {
    "tracking_required": false
  },
  "assessment": {
    "required": false
  },
  "portfolio": {
    "required": false
  },
  "reporting": {
    "required": false
  },
  "funding": {
    "available": true,
    "varies_by_division": true
  }
}'::jsonb,
'https://www.saskatchewan.ca/residents/education-and-learning/prek-12-education/alternative-education/home-based-education',
'[
  {"title": "Saskatchewan Home-Based Education", "url": "https://www.saskatchewan.ca/residents/education-and-learning/prek-12-education/alternative-education/home-based-education"},
  {"title": "HSLDA Canada", "url": "https://hslda.org/post/canada"}
]'::jsonb,
'Saskatchewan requires annual notification to school division. Some funding may be available depending on division.'),

-- ============================================================================
-- MANITOBA
-- ============================================================================
('MB', 'Manitoba', 'CA', 'province', 'low', '{
  "notification": {
    "required": true,
    "frequency": "annual",
    "to": "school_division",
    "form": "statement_of_intent"
  },
  "curriculum": {
    "approval_required": false,
    "subjects_required": []
  },
  "attendance": {
    "tracking_required": false
  },
  "assessment": {
    "required": false
  },
  "portfolio": {
    "required": false
  },
  "reporting": {
    "required": false
  },
  "funding": {
    "available": false
  }
}'::jsonb,
'https://www.edu.gov.mb.ca/k12/schools/ind/homeschool/index.html',
'[
  {"title": "Manitoba Home Schooling", "url": "https://www.edu.gov.mb.ca/k12/schools/ind/homeschool/index.html"},
  {"title": "HSLDA Canada", "url": "https://hslda.org/post/canada"}
]'::jsonb,
'Manitoba requires notification via statement of intent to school division. No other requirements.'),

-- ============================================================================
-- NOVA SCOTIA
-- ============================================================================
('NS', 'Nova Scotia', 'CA', 'province', 'moderate', '{
  "notification": {
    "required": true,
    "frequency": "annual",
    "to": "minister_of_education"
  },
  "curriculum": {
    "approval_required": false,
    "education_plan_required": true
  },
  "attendance": {
    "tracking_required": false
  },
  "assessment": {
    "required": true,
    "frequency": "annual",
    "type": "progress_report"
  },
  "portfolio": {
    "required": false,
    "recommended": true
  },
  "reporting": {
    "required": true,
    "frequency": "annual"
  },
  "funding": {
    "available": false
  }
}'::jsonb,
'https://www.ednet.ns.ca/homeschool',
'[
  {"title": "Nova Scotia Home Education", "url": "https://www.ednet.ns.ca/homeschool"},
  {"title": "HSLDA Canada", "url": "https://hslda.org/post/canada"}
]'::jsonb,
'Nova Scotia requires registration, education plan, and annual progress report.'),

-- ============================================================================
-- NEW BRUNSWICK
-- ============================================================================
('NB', 'New Brunswick', 'CA', 'province', 'low', '{
  "notification": {
    "required": true,
    "frequency": "annual",
    "to": "school_district"
  },
  "curriculum": {
    "approval_required": false,
    "education_plan_required": true
  },
  "attendance": {
    "tracking_required": false
  },
  "assessment": {
    "required": false
  },
  "portfolio": {
    "required": false
  },
  "reporting": {
    "required": false
  },
  "funding": {
    "available": false
  }
}'::jsonb,
'https://www2.gnb.ca/content/gnb/en/services/services_renderer.201309.Home_Schooling.html',
'[
  {"title": "New Brunswick Home Schooling", "url": "https://www2.gnb.ca/content/gnb/en/services/services_renderer.201309.Home_Schooling.html"},
  {"title": "HSLDA Canada", "url": "https://hslda.org/post/canada"}
]'::jsonb,
'New Brunswick requires notification and education plan. Homeschooling is recognized via policy rather than legislation.'),

-- ============================================================================
-- PRINCE EDWARD ISLAND
-- ============================================================================
('PE', 'Prince Edward Island', 'CA', 'province', 'moderate', '{
  "notification": {
    "required": true,
    "frequency": "annual",
    "to": "school_board"
  },
  "curriculum": {
    "approval_required": false,
    "education_plan_required": true
  },
  "attendance": {
    "tracking_required": false
  },
  "assessment": {
    "required": true,
    "frequency": "annual",
    "type": "progress_review"
  },
  "portfolio": {
    "required": false
  },
  "reporting": {
    "required": true,
    "frequency": "annual"
  },
  "funding": {
    "available": false
  }
}'::jsonb,
'https://www.princeedwardisland.ca/en/information/education-and-lifelong-learning/home-education',
'[
  {"title": "PEI Home Education", "url": "https://www.princeedwardisland.ca/en/information/education-and-lifelong-learning/home-education"},
  {"title": "HSLDA Canada", "url": "https://hslda.org/post/canada"}
]'::jsonb,
'Prince Edward Island requires notification, education plan, and annual progress review.'),

-- ============================================================================
-- NEWFOUNDLAND AND LABRADOR
-- ============================================================================
('NL', 'Newfoundland and Labrador', 'CA', 'province', 'low', '{
  "notification": {
    "required": true,
    "frequency": "annual",
    "to": "school_district"
  },
  "curriculum": {
    "approval_required": false,
    "subjects_required": []
  },
  "attendance": {
    "tracking_required": false
  },
  "assessment": {
    "required": false
  },
  "portfolio": {
    "required": false
  },
  "reporting": {
    "required": false
  },
  "funding": {
    "available": false
  }
}'::jsonb,
'https://www.gov.nl.ca/education/',
'[
  {"title": "HSLDA Canada", "url": "https://hslda.org/post/canada"}
]'::jsonb,
'Newfoundland and Labrador requires annual notification to school district.')

ON CONFLICT (state_code) DO UPDATE SET
  state_name = EXCLUDED.state_name,
  country = EXCLUDED.country,
  jurisdiction_type = EXCLUDED.jurisdiction_type,
  requirement_level = EXCLUDED.requirement_level,
  requirements = EXCLUDED.requirements,
  official_website = EXCLUDED.official_website,
  resource_links = EXCLUDED.resource_links,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- ============================================================================
-- ADD JURISDICTION TO USER PROFILES
-- ============================================================================
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS jurisdiction_code TEXT DEFAULT 'AB',
ADD COLUMN IF NOT EXISTS jurisdiction_country TEXT DEFAULT 'CA';

-- Add index for jurisdiction lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_jurisdiction
ON user_profiles(jurisdiction_code, jurisdiction_country);

-- ============================================================================
-- UPDATE PROGRESS REPORTS TABLE
-- Add jurisdiction fields (rename state_code to jurisdiction_code)
-- ============================================================================
ALTER TABLE progress_reports
ADD COLUMN IF NOT EXISTS jurisdiction_country TEXT DEFAULT 'CA';

-- ============================================================================
-- CREATE VIEW FOR EASIER JURISDICTION QUERIES
-- ============================================================================
CREATE OR REPLACE VIEW jurisdiction_requirements AS
SELECT
  id,
  state_code AS code,
  state_name AS name,
  country,
  jurisdiction_type,
  requirement_level,
  requirements,
  official_website,
  resource_links,
  notes,
  last_verified,
  is_active,
  created_at,
  updated_at
FROM state_compliance_templates
WHERE is_active = true;

-- ============================================================================
-- CREATE API-FRIENDLY FUNCTION TO GET JURISDICTION REQUIREMENTS
-- ============================================================================
CREATE OR REPLACE FUNCTION get_jurisdiction_requirements(p_code TEXT, p_country TEXT DEFAULT 'CA')
RETURNS TABLE(
  code TEXT,
  name TEXT,
  country TEXT,
  jurisdiction_type TEXT,
  requirement_level TEXT,
  requirements JSONB,
  official_website TEXT,
  resource_links JSONB,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sct.state_code,
    sct.state_name,
    sct.country,
    sct.jurisdiction_type,
    sct.requirement_level,
    sct.requirements,
    sct.official_website,
    sct.resource_links,
    sct.notes
  FROM state_compliance_templates sct
  WHERE sct.state_code = p_code
    AND sct.country = p_country
    AND sct.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON COLUMN state_compliance_templates.country IS 'Country code: US or CA';
COMMENT ON COLUMN state_compliance_templates.jurisdiction_type IS 'Type: state (US), province (CA), or territory';
COMMENT ON COLUMN user_profiles.jurisdiction_code IS 'User home education jurisdiction (e.g., AB for Alberta, NY for New York)';
COMMENT ON COLUMN user_profiles.jurisdiction_country IS 'Country: US or CA';
COMMENT ON VIEW jurisdiction_requirements IS 'API-friendly view of all jurisdiction requirements';
COMMENT ON FUNCTION get_jurisdiction_requirements IS 'Get requirements for a specific jurisdiction by code and country';
