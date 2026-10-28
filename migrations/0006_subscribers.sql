-- Email signups for the "new this week" changelog. One row per address; source is where the form was (changelog, landing).
CREATE TABLE subscribers (
  email TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  source TEXT NOT NULL
) WITHOUT ROWID;
