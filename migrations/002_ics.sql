-- Independent course records preserve all existing F5 enrollments and attempts.
CREATE TABLE ics_progress (
 user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 lesson TEXT NOT NULL DEFAULT 'process', completed TEXT NOT NULL DEFAULT '[]',
 notes TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL
);
CREATE TABLE ics_assessments (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 lesson TEXT NOT NULL, choice INTEGER NOT NULL, correct INTEGER NOT NULL,
 updated_at TEXT NOT NULL, PRIMARY KEY (user_id, lesson)
);
