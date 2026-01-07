-- Migration: Syllabus Templates Database
-- Created: 2026-01-06
-- Purpose: Store curated syllabus templates for common courses to improve confidence

-- ============================================================================
-- Table: syllabus_templates
-- Pre-populated templates for common courses (Statistics, Calculus, CS, etc.)
-- Used as fallback when web search fails, provides higher confidence than AI-only
-- ============================================================================
CREATE TABLE IF NOT EXISTS syllabus_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Subject classification (for matching)
  subject_category TEXT NOT NULL,  -- e.g., 'statistics', 'calculus', 'computer_science'
  subject_keywords TEXT[] DEFAULT '{}',  -- Keywords for fuzzy matching

  -- Course metadata (optional, for institution-specific templates)
  institution TEXT,  -- NULL for generic templates
  institution_type TEXT CHECK (institution_type IN ('university', 'college', 'community_college', 'online')),
  country TEXT DEFAULT 'US',
  course_code_pattern TEXT,  -- Regex pattern, e.g., 'STAT\s*1[0-9]{2}'

  -- Template content
  course_name TEXT NOT NULL,
  course_description TEXT NOT NULL,
  typical_duration_weeks INTEGER DEFAULT 14,
  level TEXT CHECK (level IN ('introductory', 'intermediate', 'advanced', 'graduate')),

  learning_objectives JSONB NOT NULL DEFAULT '[]',
  weekly_schedule JSONB NOT NULL DEFAULT '[]',
  textbooks JSONB NOT NULL DEFAULT '[]',
  grading_scheme JSONB DEFAULT '{}',

  -- Quality metrics
  confidence_boost DECIMAL(3,2) DEFAULT 0.30,  -- Added to base confidence when matched
  usage_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,  -- Manually reviewed

  -- Metadata
  source TEXT,  -- Where this template came from
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient lookup
CREATE INDEX IF NOT EXISTS idx_syllabus_templates_subject ON syllabus_templates(subject_category);
CREATE INDEX IF NOT EXISTS idx_syllabus_templates_keywords ON syllabus_templates USING GIN (subject_keywords);
CREATE INDEX IF NOT EXISTS idx_syllabus_templates_institution ON syllabus_templates(institution) WHERE institution IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_syllabus_templates_level ON syllabus_templates(level);
CREATE INDEX IF NOT EXISTS idx_syllabus_templates_verified ON syllabus_templates(is_verified) WHERE is_verified = true;

-- ============================================================================
-- Table: syllabus_contributions
-- User-contributed syllabi pending verification
-- ============================================================================
CREATE TABLE IF NOT EXISTS syllabus_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT REFERENCES user_profiles(id) ON DELETE SET NULL,

  -- Course info
  institution TEXT NOT NULL,
  course_code TEXT,
  course_name TEXT NOT NULL,
  semester TEXT,
  year INTEGER,

  -- Content
  syllabus_data JSONB NOT NULL,  -- Full syllabus JSON
  source_file_url TEXT,  -- If uploaded from PDF

  -- Moderation
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'merged')),
  reviewed_by TEXT,
  review_notes TEXT,

  -- Link to template if merged
  merged_template_id UUID REFERENCES syllabus_templates(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_syllabus_contributions_status ON syllabus_contributions(status);
CREATE INDEX IF NOT EXISTS idx_syllabus_contributions_user ON syllabus_contributions(user_id);

-- ============================================================================
-- Function: Match syllabus template
-- Returns best matching template for a given course
-- ============================================================================
CREATE OR REPLACE FUNCTION match_syllabus_template(
  p_course_name TEXT,
  p_subject TEXT DEFAULT NULL,
  p_institution TEXT DEFAULT NULL,
  p_level TEXT DEFAULT NULL
)
RETURNS TABLE (
  template_id UUID,
  match_score DECIMAL,
  subject_category TEXT,
  course_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    st.id AS template_id,
    (
      -- Base score from keyword matching
      CASE
        WHEN p_course_name ILIKE '%' || st.subject_category || '%' THEN 0.5
        WHEN st.subject_keywords && string_to_array(LOWER(p_course_name), ' ') THEN 0.4
        ELSE 0.2
      END
      +
      -- Bonus for institution match
      CASE WHEN p_institution IS NOT NULL AND st.institution ILIKE '%' || p_institution || '%' THEN 0.2 ELSE 0 END
      +
      -- Bonus for level match
      CASE WHEN p_level IS NOT NULL AND st.level = p_level THEN 0.1 ELSE 0 END
      +
      -- Bonus for verified templates
      CASE WHEN st.is_verified THEN 0.1 ELSE 0 END
    )::DECIMAL AS match_score,
    st.subject_category,
    st.course_name
  FROM syllabus_templates st
  WHERE
    -- Must have some relevance
    (
      p_course_name ILIKE '%' || st.subject_category || '%'
      OR st.subject_keywords && string_to_array(LOWER(p_course_name), ' ')
      OR (p_subject IS NOT NULL AND st.subject_category ILIKE '%' || p_subject || '%')
    )
  ORDER BY match_score DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS Policies
-- ============================================================================
ALTER TABLE syllabus_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE syllabus_contributions ENABLE ROW LEVEL SECURITY;

-- Templates are public read
CREATE POLICY "Public can read syllabus templates"
  ON syllabus_templates FOR SELECT USING (true);

-- Only system can modify templates
CREATE POLICY "System can manage syllabus templates"
  ON syllabus_templates FOR ALL WITH CHECK (true);

-- Users can view their own contributions
CREATE POLICY "Users can view own contributions"
  ON syllabus_contributions FOR SELECT
  USING (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'
  ));

-- Users can insert contributions
CREATE POLICY "Users can create contributions"
  ON syllabus_contributions FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt()->>'sub'
  ));

-- ============================================================================
-- Trigger: Update timestamps
-- ============================================================================
CREATE TRIGGER trigger_syllabus_templates_updated_at
  BEFORE UPDATE ON syllabus_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Seed: Common Course Templates
-- ============================================================================

-- Statistics (Introductory)
INSERT INTO syllabus_templates (
  subject_category,
  subject_keywords,
  course_name,
  course_description,
  level,
  typical_duration_weeks,
  learning_objectives,
  weekly_schedule,
  textbooks,
  grading_scheme,
  confidence_boost,
  is_verified,
  source
) VALUES (
  'statistics',
  ARRAY['statistics', 'stat', 'statistical', 'data analysis', 'probability', 'hypothesis testing'],
  'Introduction to Statistics',
  'This course provides a comprehensive introduction to statistical thinking and data analysis. Students will learn to collect, organize, analyze, and interpret data using both descriptive and inferential statistics. Topics include probability, sampling distributions, hypothesis testing, confidence intervals, regression, and correlation.',
  'introductory',
  14,
  '[
    "Understand and apply descriptive statistics including measures of central tendency and variability",
    "Calculate and interpret probabilities using various probability distributions",
    "Construct and interpret confidence intervals for population parameters",
    "Perform hypothesis tests and draw appropriate conclusions",
    "Conduct simple linear regression analysis and interpret results",
    "Use statistical software to analyze real-world datasets"
  ]'::JSONB,
  '[
    {"week": 1, "topic": "Introduction to Statistics and Data Types", "readings": ["OpenIntro Statistics Ch. 1", "Freedman Ch. 1-2"], "assignments": ["Homework 1: Data Classification"], "learningObjectives": ["Distinguish between categorical and numerical data", "Identify population vs sample"]},
    {"week": 2, "topic": "Descriptive Statistics: Center and Spread", "readings": ["OpenIntro Statistics Ch. 2.1-2.2", "Freedman Ch. 4-5"], "assignments": ["Homework 2: Calculating Mean, Median, SD"], "learningObjectives": ["Calculate measures of central tendency", "Interpret standard deviation"]},
    {"week": 3, "topic": "Data Visualization and Distributions", "readings": ["OpenIntro Statistics Ch. 2.3-2.4", "Freedman Ch. 3"], "assignments": ["Homework 3: Creating Histograms and Boxplots"], "learningObjectives": ["Create and interpret histograms", "Identify distribution shapes"]},
    {"week": 4, "topic": "Introduction to Probability", "readings": ["OpenIntro Statistics Ch. 3.1-3.2", "Freedman Ch. 13-14"], "assignments": ["Homework 4: Probability Calculations"], "learningObjectives": ["Apply probability rules", "Calculate conditional probabilities"]},
    {"week": 5, "topic": "Discrete Probability Distributions", "readings": ["OpenIntro Statistics Ch. 3.3-3.4", "Freedman Ch. 15"], "assignments": ["Homework 5: Binomial Distribution"], "learningObjectives": ["Use binomial distribution", "Calculate expected value"]},
    {"week": 6, "topic": "Normal Distribution", "readings": ["OpenIntro Statistics Ch. 3.5", "Freedman Ch. 5"], "assignments": ["Homework 6: Normal Distribution Problems"], "learningObjectives": ["Calculate z-scores", "Use standard normal table"]},
    {"week": 7, "topic": "Midterm Review and Exam", "readings": ["Review Chapters 1-3"], "assignments": ["Midterm Exam"], "learningObjectives": ["Demonstrate mastery of descriptive statistics and probability"]},
    {"week": 8, "topic": "Sampling Distributions", "readings": ["OpenIntro Statistics Ch. 4.1", "Freedman Ch. 16-17"], "assignments": ["Homework 7: Central Limit Theorem"], "learningObjectives": ["Understand sampling variability", "Apply Central Limit Theorem"]},
    {"week": 9, "topic": "Confidence Intervals for Means", "readings": ["OpenIntro Statistics Ch. 4.2", "Freedman Ch. 21"], "assignments": ["Homework 8: Constructing CIs"], "learningObjectives": ["Construct confidence intervals", "Interpret margin of error"]},
    {"week": 10, "topic": "Hypothesis Testing: Fundamentals", "readings": ["OpenIntro Statistics Ch. 4.3", "Freedman Ch. 26-27"], "assignments": ["Homework 9: One-Sample Tests"], "learningObjectives": ["State null and alternative hypotheses", "Interpret p-values"]},
    {"week": 11, "topic": "Hypothesis Testing: Two Samples", "readings": ["OpenIntro Statistics Ch. 5", "Freedman Ch. 27"], "assignments": ["Homework 10: Two-Sample Tests"], "learningObjectives": ["Perform two-sample t-tests", "Test for difference in proportions"]},
    {"week": 12, "topic": "Chi-Square Tests", "readings": ["OpenIntro Statistics Ch. 6", "Freedman Ch. 28"], "assignments": ["Homework 11: Chi-Square Analysis"], "learningObjectives": ["Conduct chi-square goodness of fit", "Perform chi-square test of independence"]},
    {"week": 13, "topic": "Correlation and Simple Linear Regression", "readings": ["OpenIntro Statistics Ch. 7", "Freedman Ch. 8-12"], "assignments": ["Homework 12: Regression Project"], "learningObjectives": ["Calculate correlation coefficient", "Fit simple linear regression model"]},
    {"week": 14, "topic": "Course Review and Final Exam", "readings": ["Review All Chapters"], "assignments": ["Final Exam"], "learningObjectives": ["Synthesize all statistical concepts"]}
  ]'::JSONB,
  '[
    {"title": "OpenIntro Statistics", "authors": ["David Diez", "Mine Çetinkaya-Rundel", "Christopher Barr"], "isbn": "978-1943450077", "required": true},
    {"title": "Statistics", "authors": ["David Freedman", "Robert Pisani", "Roger Purves"], "isbn": "978-0393929720", "required": false}
  ]'::JSONB,
  '{"Midterm Exam": 25, "Final Exam": 30, "Homework Assignments": 30, "Participation": 10, "Statistical Software Labs": 5}'::JSONB,
  0.35,
  true,
  'Curated from common statistics curricula'
),

-- Calculus I
(
  'calculus',
  ARRAY['calculus', 'calc', 'derivatives', 'integrals', 'limits', 'math', 'mathematical analysis'],
  'Calculus I: Differential Calculus',
  'This course introduces students to differential calculus, covering limits, continuity, derivatives, and their applications. Students will develop skills in computing derivatives of algebraic, trigonometric, exponential, and logarithmic functions, and apply these techniques to solve optimization and related rates problems.',
  'introductory',
  14,
  '[
    "Evaluate limits using algebraic techniques and L''Hopital''s Rule",
    "Determine continuity and identify types of discontinuities",
    "Compute derivatives using the limit definition and differentiation rules",
    "Apply derivatives to analyze functions, find extrema, and solve optimization problems",
    "Solve related rates problems using implicit differentiation",
    "Understand and apply the Mean Value Theorem"
  ]'::JSONB,
  '[
    {"week": 1, "topic": "Precalculus Review: Functions and Graphs", "readings": ["Stewart Ch. 1.1-1.3", "Thomas Ch. 1"], "assignments": ["Homework 1: Function Review"], "learningObjectives": ["Review function notation", "Graph basic functions"]},
    {"week": 2, "topic": "Limits and Limit Laws", "readings": ["Stewart Ch. 2.1-2.3", "Thomas Ch. 2.1-2.2"], "assignments": ["Homework 2: Computing Limits"], "learningObjectives": ["Evaluate limits graphically and algebraically", "Apply limit laws"]},
    {"week": 3, "topic": "Continuity and the Intermediate Value Theorem", "readings": ["Stewart Ch. 2.5", "Thomas Ch. 2.5"], "assignments": ["Homework 3: Continuity Analysis"], "learningObjectives": ["Define continuity at a point", "Apply IVT"]},
    {"week": 4, "topic": "Introduction to Derivatives", "readings": ["Stewart Ch. 2.7-2.8", "Thomas Ch. 3.1-3.2"], "assignments": ["Homework 4: Derivative Definition"], "learningObjectives": ["Compute derivatives from definition", "Interpret derivative as slope"]},
    {"week": 5, "topic": "Differentiation Rules", "readings": ["Stewart Ch. 3.1-3.2", "Thomas Ch. 3.3"], "assignments": ["Homework 5: Product and Quotient Rules"], "learningObjectives": ["Apply power, product, quotient rules", "Differentiate polynomial functions"]},
    {"week": 6, "topic": "Chain Rule and Implicit Differentiation", "readings": ["Stewart Ch. 3.4-3.5", "Thomas Ch. 3.6-3.7"], "assignments": ["Homework 6: Chain Rule Problems"], "learningObjectives": ["Apply chain rule", "Perform implicit differentiation"]},
    {"week": 7, "topic": "Midterm Review and Exam", "readings": ["Review Chapters 1-3"], "assignments": ["Midterm Exam"], "learningObjectives": ["Demonstrate proficiency in limits and derivatives"]},
    {"week": 8, "topic": "Derivatives of Transcendental Functions", "readings": ["Stewart Ch. 3.3, 3.6", "Thomas Ch. 3.8-3.9"], "assignments": ["Homework 7: Trig and Exponential Derivatives"], "learningObjectives": ["Differentiate trig functions", "Differentiate exponential and log functions"]},
    {"week": 9, "topic": "Related Rates", "readings": ["Stewart Ch. 3.9", "Thomas Ch. 3.10"], "assignments": ["Homework 8: Related Rates Problems"], "learningObjectives": ["Set up related rates equations", "Solve applied problems"]},
    {"week": 10, "topic": "Linear Approximation and Differentials", "readings": ["Stewart Ch. 3.10", "Thomas Ch. 3.11"], "assignments": ["Homework 9: Linearization"], "learningObjectives": ["Use tangent line approximation", "Calculate differentials"]},
    {"week": 11, "topic": "Extreme Values and the Mean Value Theorem", "readings": ["Stewart Ch. 4.1-4.2", "Thomas Ch. 4.1-4.2"], "assignments": ["Homework 10: Finding Extrema"], "learningObjectives": ["Find critical points", "Apply Mean Value Theorem"]},
    {"week": 12, "topic": "Curve Sketching and Optimization", "readings": ["Stewart Ch. 4.3-4.4", "Thomas Ch. 4.3-4.4"], "assignments": ["Homework 11: Curve Analysis"], "learningObjectives": ["Analyze increasing/decreasing intervals", "Find inflection points"]},
    {"week": 13, "topic": "Optimization Applications", "readings": ["Stewart Ch. 4.7", "Thomas Ch. 4.5"], "assignments": ["Homework 12: Optimization Project"], "learningObjectives": ["Solve real-world optimization problems", "Model and maximize/minimize quantities"]},
    {"week": 14, "topic": "Course Review and Final Exam", "readings": ["Review All Chapters"], "assignments": ["Final Exam"], "learningObjectives": ["Demonstrate mastery of differential calculus"]}
  ]'::JSONB,
  '[
    {"title": "Calculus: Early Transcendentals", "authors": ["James Stewart"], "isbn": "978-1337613927", "required": true},
    {"title": "Thomas'' Calculus: Early Transcendentals", "authors": ["Joel Hass", "Christopher Heil", "Maurice Weir"], "isbn": "978-0134439020", "required": false}
  ]'::JSONB,
  '{"Midterm Exam": 25, "Final Exam": 30, "Homework": 25, "Quizzes": 15, "Participation": 5}'::JSONB,
  0.35,
  true,
  'Curated from common calculus curricula'
),

-- Introduction to Computer Science
(
  'computer_science',
  ARRAY['computer science', 'cs', 'programming', 'coding', 'python', 'intro to cs', 'algorithms', 'software'],
  'Introduction to Computer Science',
  'This course provides a broad introduction to computer science fundamentals. Students will learn programming concepts using Python, including variables, control structures, functions, and data structures. The course also covers computational thinking, algorithm design, and basic software development practices.',
  'introductory',
  14,
  '[
    "Write programs using variables, expressions, and control structures",
    "Design and implement functions with appropriate parameters and return values",
    "Work with fundamental data structures including lists, dictionaries, and strings",
    "Apply algorithmic thinking to solve computational problems",
    "Debug and test programs systematically",
    "Understand basic concepts of object-oriented programming"
  ]'::JSONB,
  '[
    {"week": 1, "topic": "Introduction to Computing and Python", "readings": ["Think Python Ch. 1", "Automate Ch. 0-1"], "assignments": ["Lab 1: Python Setup and Hello World"], "learningObjectives": ["Understand what computer science is", "Write first Python program"]},
    {"week": 2, "topic": "Variables, Types, and Expressions", "readings": ["Think Python Ch. 2", "Automate Ch. 1"], "assignments": ["Homework 1: Variables and Math"], "learningObjectives": ["Use variables and data types", "Evaluate expressions"]},
    {"week": 3, "topic": "Functions", "readings": ["Think Python Ch. 3, 6", "Automate Ch. 3"], "assignments": ["Homework 2: Writing Functions"], "learningObjectives": ["Define and call functions", "Understand scope"]},
    {"week": 4, "topic": "Conditionals", "readings": ["Think Python Ch. 5", "Automate Ch. 2"], "assignments": ["Homework 3: If Statements"], "learningObjectives": ["Use if/elif/else", "Write boolean expressions"]},
    {"week": 5, "topic": "Iteration: While and For Loops", "readings": ["Think Python Ch. 7", "Automate Ch. 2"], "assignments": ["Homework 4: Loops"], "learningObjectives": ["Write while loops", "Write for loops"]},
    {"week": 6, "topic": "Strings", "readings": ["Think Python Ch. 8", "Automate Ch. 6"], "assignments": ["Homework 5: String Manipulation"], "learningObjectives": ["Index and slice strings", "Use string methods"]},
    {"week": 7, "topic": "Midterm Review and Exam", "readings": ["Review Chapters 1-8"], "assignments": ["Midterm Exam"], "learningObjectives": ["Demonstrate programming fundamentals"]},
    {"week": 8, "topic": "Lists", "readings": ["Think Python Ch. 10", "Automate Ch. 4"], "assignments": ["Homework 6: List Operations"], "learningObjectives": ["Create and modify lists", "Use list methods and slicing"]},
    {"week": 9, "topic": "Dictionaries", "readings": ["Think Python Ch. 11", "Automate Ch. 5"], "assignments": ["Homework 7: Dictionary Programs"], "learningObjectives": ["Use key-value pairs", "Iterate over dictionaries"]},
    {"week": 10, "topic": "File I/O", "readings": ["Think Python Ch. 14", "Automate Ch. 8"], "assignments": ["Homework 8: Reading and Writing Files"], "learningObjectives": ["Read from files", "Write to files"]},
    {"week": 11, "topic": "Introduction to Algorithms", "readings": ["Think Python Ch. 12", "Grokking Algorithms Ch. 1-2"], "assignments": ["Homework 9: Searching and Sorting"], "learningObjectives": ["Implement linear search", "Understand algorithm efficiency"]},
    {"week": 12, "topic": "Object-Oriented Programming Basics", "readings": ["Think Python Ch. 15-17"], "assignments": ["Homework 10: Classes and Objects"], "learningObjectives": ["Define classes", "Create objects"]},
    {"week": 13, "topic": "Final Project Work", "readings": ["Project Guidelines"], "assignments": ["Final Project"], "learningObjectives": ["Apply all concepts to a substantial program"]},
    {"week": 14, "topic": "Course Review and Final Exam", "readings": ["Review All Materials"], "assignments": ["Final Exam"], "learningObjectives": ["Demonstrate comprehensive understanding"]}
  ]'::JSONB,
  '[
    {"title": "Think Python: How to Think Like a Computer Scientist", "authors": ["Allen B. Downey"], "isbn": "978-1491939369", "required": true},
    {"title": "Automate the Boring Stuff with Python", "authors": ["Al Sweigart"], "isbn": "978-1593279929", "required": false},
    {"title": "Grokking Algorithms", "authors": ["Aditya Bhargava"], "isbn": "978-1617292231", "required": false}
  ]'::JSONB,
  '{"Midterm Exam": 20, "Final Exam": 25, "Homework": 25, "Final Project": 20, "Labs": 10}'::JSONB,
  0.35,
  true,
  'Curated from common CS101 curricula'
),

-- Psychology 101
(
  'psychology',
  ARRAY['psychology', 'psych', 'intro to psychology', 'behavioral science', 'mental processes', 'cognitive'],
  'Introduction to Psychology',
  'This course provides a comprehensive overview of psychology as a scientific discipline. Students will explore the biological bases of behavior, sensation and perception, learning, memory, cognition, development, personality, psychological disorders, and social psychology.',
  'introductory',
  14,
  '[
    "Describe the historical development and major perspectives in psychology",
    "Explain the biological foundations of behavior including brain structure and function",
    "Analyze how we perceive, learn, and remember information",
    "Examine human development across the lifespan",
    "Identify major psychological disorders and treatment approaches",
    "Apply psychological principles to understand social behavior"
  ]'::JSONB,
  '[
    {"week": 1, "topic": "Introduction to Psychology: History and Research Methods", "readings": ["Myers Ch. 1", "OpenStax Psychology Ch. 1-2"], "assignments": ["Discussion: What is Psychology?"], "learningObjectives": ["Define psychology as a science", "Identify major perspectives"]},
    {"week": 2, "topic": "Biological Bases of Behavior: Neurons and the Nervous System", "readings": ["Myers Ch. 2", "OpenStax Psychology Ch. 3"], "assignments": ["Homework 1: Brain Anatomy"], "learningObjectives": ["Describe neuron structure", "Explain neural communication"]},
    {"week": 3, "topic": "The Brain and Behavior", "readings": ["Myers Ch. 2", "OpenStax Psychology Ch. 3"], "assignments": ["Homework 2: Brain Functions"], "learningObjectives": ["Identify brain structures", "Explain brain plasticity"]},
    {"week": 4, "topic": "Sensation and Perception", "readings": ["Myers Ch. 6", "OpenStax Psychology Ch. 5"], "assignments": ["Homework 3: Perception Experiments"], "learningObjectives": ["Distinguish sensation from perception", "Explain perceptual principles"]},
    {"week": 5, "topic": "States of Consciousness", "readings": ["Myers Ch. 3", "OpenStax Psychology Ch. 4"], "assignments": ["Sleep Journal Assignment"], "learningObjectives": ["Describe sleep stages", "Explain altered states"]},
    {"week": 6, "topic": "Learning: Classical and Operant Conditioning", "readings": ["Myers Ch. 7", "OpenStax Psychology Ch. 6"], "assignments": ["Homework 4: Conditioning Examples"], "learningObjectives": ["Apply classical conditioning", "Apply operant conditioning"]},
    {"week": 7, "topic": "Midterm Review and Exam", "readings": ["Review Chapters 1-7"], "assignments": ["Midterm Exam"], "learningObjectives": ["Demonstrate mastery of first half content"]},
    {"week": 8, "topic": "Memory", "readings": ["Myers Ch. 8", "OpenStax Psychology Ch. 8"], "assignments": ["Homework 5: Memory Processes"], "learningObjectives": ["Describe memory encoding", "Explain forgetting"]},
    {"week": 9, "topic": "Thinking, Language, and Intelligence", "readings": ["Myers Ch. 9-10", "OpenStax Psychology Ch. 7"], "assignments": ["Homework 6: Problem Solving"], "learningObjectives": ["Explain cognitive processes", "Discuss intelligence theories"]},
    {"week": 10, "topic": "Human Development", "readings": ["Myers Ch. 5", "OpenStax Psychology Ch. 9"], "assignments": ["Development Case Study"], "learningObjectives": ["Describe developmental stages", "Apply developmental theories"]},
    {"week": 11, "topic": "Personality", "readings": ["Myers Ch. 14", "OpenStax Psychology Ch. 11"], "assignments": ["Homework 7: Personality Assessment"], "learningObjectives": ["Compare personality theories", "Evaluate assessment methods"]},
    {"week": 12, "topic": "Psychological Disorders", "readings": ["Myers Ch. 15", "OpenStax Psychology Ch. 15"], "assignments": ["Disorder Research Paper"], "learningObjectives": ["Classify psychological disorders", "Understand DSM criteria"]},
    {"week": 13, "topic": "Treatment and Therapy", "readings": ["Myers Ch. 16", "OpenStax Psychology Ch. 16"], "assignments": ["Homework 8: Treatment Approaches"], "learningObjectives": ["Compare therapy approaches", "Evaluate treatment effectiveness"]},
    {"week": 14, "topic": "Social Psychology and Course Review", "readings": ["Myers Ch. 13", "OpenStax Psychology Ch. 12"], "assignments": ["Final Exam"], "learningObjectives": ["Apply social psychology concepts", "Synthesize course material"]}
  ]'::JSONB,
  '[
    {"title": "Psychology", "authors": ["David G. Myers", "C. Nathan DeWall"], "isbn": "978-1319050627", "required": true},
    {"title": "Psychology (OpenStax)", "authors": ["OpenStax"], "isbn": "978-1938168352", "required": false}
  ]'::JSONB,
  '{"Midterm Exam": 20, "Final Exam": 25, "Homework": 20, "Research Paper": 15, "Participation": 10, "Quizzes": 10}'::JSONB,
  0.35,
  true,
  'Curated from common psychology curricula'
),

-- Economics (Microeconomics)
(
  'economics',
  ARRAY['economics', 'econ', 'microeconomics', 'micro', 'supply demand', 'markets', 'economic theory'],
  'Principles of Microeconomics',
  'This course introduces the fundamental principles of microeconomics. Students will learn how individuals and firms make decisions in the face of scarcity, how markets work, and why markets sometimes fail. Topics include supply and demand, consumer choice, production costs, market structures, and government intervention.',
  'introductory',
  14,
  '[
    "Apply the concepts of scarcity, opportunity cost, and marginal analysis",
    "Analyze markets using supply and demand models",
    "Understand consumer behavior and utility maximization",
    "Examine firm behavior and cost structures",
    "Compare different market structures and their outcomes",
    "Evaluate the role of government in addressing market failures"
  ]'::JSONB,
  '[
    {"week": 1, "topic": "Introduction to Economics: Scarcity and Choice", "readings": ["Mankiw Ch. 1-2", "CORE Econ Unit 1"], "assignments": ["Problem Set 1: Opportunity Cost"], "learningObjectives": ["Define economics", "Calculate opportunity cost"]},
    {"week": 2, "topic": "Thinking Like an Economist: Models and Graphs", "readings": ["Mankiw Ch. 2", "CORE Econ Unit 3"], "assignments": ["Problem Set 2: PPF Analysis"], "learningObjectives": ["Interpret economic graphs", "Understand comparative advantage"]},
    {"week": 3, "topic": "Supply and Demand", "readings": ["Mankiw Ch. 4", "CORE Econ Unit 8"], "assignments": ["Problem Set 3: Market Equilibrium"], "learningObjectives": ["Identify determinants of supply and demand", "Find equilibrium"]},
    {"week": 4, "topic": "Elasticity", "readings": ["Mankiw Ch. 5", "CORE Econ Unit 8"], "assignments": ["Problem Set 4: Elasticity Calculations"], "learningObjectives": ["Calculate price elasticity", "Apply elasticity concepts"]},
    {"week": 5, "topic": "Government Policies: Price Controls and Taxes", "readings": ["Mankiw Ch. 6", "CORE Econ Unit 8"], "assignments": ["Problem Set 5: Policy Analysis"], "learningObjectives": ["Analyze price ceilings and floors", "Evaluate tax incidence"]},
    {"week": 6, "topic": "Consumer Choice and Utility", "readings": ["Mankiw Ch. 21", "CORE Econ Unit 3"], "assignments": ["Problem Set 6: Utility Maximization"], "learningObjectives": ["Apply marginal utility theory", "Derive demand curves"]},
    {"week": 7, "topic": "Midterm Review and Exam", "readings": ["Review Chapters 1-6, 21"], "assignments": ["Midterm Exam"], "learningObjectives": ["Demonstrate understanding of market fundamentals"]},
    {"week": 8, "topic": "Production and Costs", "readings": ["Mankiw Ch. 13", "CORE Econ Unit 7"], "assignments": ["Problem Set 7: Cost Curves"], "learningObjectives": ["Distinguish cost types", "Graph cost curves"]},
    {"week": 9, "topic": "Perfect Competition", "readings": ["Mankiw Ch. 14", "CORE Econ Unit 8"], "assignments": ["Problem Set 8: Competitive Markets"], "learningObjectives": ["Characterize perfect competition", "Find profit-maximizing output"]},
    {"week": 10, "topic": "Monopoly", "readings": ["Mankiw Ch. 15", "CORE Econ Unit 7"], "assignments": ["Problem Set 9: Monopoly Analysis"], "learningObjectives": ["Identify sources of monopoly power", "Calculate monopoly outcomes"]},
    {"week": 11, "topic": "Monopolistic Competition and Oligopoly", "readings": ["Mankiw Ch. 16-17", "CORE Econ Unit 7"], "assignments": ["Problem Set 10: Market Structures"], "learningObjectives": ["Compare market structures", "Apply game theory basics"]},
    {"week": 12, "topic": "Labor Markets", "readings": ["Mankiw Ch. 18", "CORE Econ Unit 9"], "assignments": ["Problem Set 11: Labor Economics"], "learningObjectives": ["Analyze labor demand and supply", "Understand wage determination"]},
    {"week": 13, "topic": "Market Failures: Externalities and Public Goods", "readings": ["Mankiw Ch. 10-11", "CORE Econ Unit 12"], "assignments": ["Policy Brief Assignment"], "learningObjectives": ["Identify market failures", "Evaluate policy solutions"]},
    {"week": 14, "topic": "Course Review and Final Exam", "readings": ["Review All Chapters"], "assignments": ["Final Exam"], "learningObjectives": ["Synthesize microeconomic concepts"]}
  ]'::JSONB,
  '[
    {"title": "Principles of Microeconomics", "authors": ["N. Gregory Mankiw"], "isbn": "978-0357133484", "required": true},
    {"title": "The Economy (CORE Econ)", "authors": ["The CORE Team"], "isbn": "978-0198810247", "required": false}
  ]'::JSONB,
  '{"Midterm Exam": 25, "Final Exam": 30, "Problem Sets": 30, "Policy Brief": 10, "Participation": 5}'::JSONB,
  0.35,
  true,
  'Curated from common economics curricula'
);

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE syllabus_templates IS 'Pre-populated course templates for common subjects, used when web search fails';
COMMENT ON TABLE syllabus_contributions IS 'User-submitted syllabi pending review and potential merging into templates';
COMMENT ON FUNCTION match_syllabus_template IS 'Finds best matching template based on course name, subject, and institution';
