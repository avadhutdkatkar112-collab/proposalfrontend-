-- Proposal tracking database schema

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id VARCHAR(32) UNIQUE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  is_online BOOLEAN DEFAULT false,
  current_section VARCHAR(50),
  progress INTEGER DEFAULT 0,
  response VARCHAR(255),
  responded_at TIMESTAMPTZ,
  ip_address VARCHAR(45),
  ip_city VARCHAR(100),
  ip_region VARCHAR(100),
  ip_country VARCHAR(100),
  ip_org TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  label TEXT NOT NULL,
  section VARCHAR(50),
  progress INTEGER,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_online ON sessions(is_online);
CREATE INDEX IF NOT EXISTS idx_sessions_visitor ON sessions(visitor_id);
