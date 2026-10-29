-- INTERVUEX Database Reset Script
-- This will clear all data and reset the database to fresh state

-- Drop all tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS violations CASCADE;
DROP TABLE IF EXISTS scores CASCADE;
DROP TABLE IF EXISTS interview_sessions CASCADE;
DROP TABLE IF EXISTS candidates CASCADE;
DROP TABLE IF EXISTS recruiters CASCADE;

-- Recreate all tables
CREATE TABLE recruiters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    resume_url TEXT,
    resume_parsed_data JSONB,
    skills JSONB,
    created_by UUID REFERENCES recruiters(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE interview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES candidates(id),
    recruiter_id UUID REFERENCES recruiters(id),
    access_token VARCHAR(255) UNIQUE NOT NULL,
    duration_seconds INTEGER DEFAULT 1800,
    expires_at TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled',
    questions JSONB,
    answers JSONB,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    device_fingerprint JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES interview_sessions(id),
    technical_score INTEGER,
    problem_solving_score INTEGER,
    communication_score INTEGER,
    resume_authenticity_score INTEGER,
    integrity_risk_score INTEGER,
    final_score INTEGER,
    shortlist_status VARCHAR(50),
    ai_evaluation JSONB,
    recruiter_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES interview_sessions(id),
    type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    details TEXT,
    screenshot_url TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    session_id UUID,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_candidates_email ON candidates(email);
CREATE INDEX idx_interview_sessions_token ON interview_sessions(access_token);
CREATE INDEX idx_interview_sessions_status ON interview_sessions(status);
CREATE INDEX idx_scores_session ON scores(session_id);
CREATE INDEX idx_violations_session ON violations(session_id);

-- Success message
SELECT 'Database reset successfully! All tables recreated.' AS message;
 