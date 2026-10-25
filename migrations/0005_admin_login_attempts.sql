-- Fixed-window counters for admin sign-in attempts. Buckets are 'global' or a hash of the IP, never the IP itself.
CREATE TABLE admin_login_attempts (
  bucket TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
) WITHOUT ROWID;
