-- Per-lesson submissions are independent of optional quiz scores.
CREATE TABLE ics_workbook (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 lesson TEXT NOT NULL, note TEXT NOT NULL, updated_at TEXT NOT NULL,
 PRIMARY KEY (user_id,lesson)
);
