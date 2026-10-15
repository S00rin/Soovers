CREATE TABLE users (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
  password_hash TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE TABLE enrollments (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL DEFAULT 'f5-big-ip', enrolled_at TEXT NOT NULL,
  chapter INTEGER NOT NULL DEFAULT 0, parts TEXT NOT NULL DEFAULT '[]',
  answers TEXT NOT NULL DEFAULT '{}', solved TEXT NOT NULL DEFAULT '[]',
  best_correct INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL
);
CREATE TABLE attempts (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, case_id TEXT, submission TEXT NOT NULL,
  correct INTEGER NOT NULL, total INTEGER NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX attempts_user ON attempts(user_id, created_at);
CREATE TABLE audit_events (
  id INTEGER PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
