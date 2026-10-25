-- Daily aggregates only: no IPs, cookies or user agents are stored.
CREATE TABLE sponsor_events (
  booking_id TEXT NOT NULL REFERENCES bookings (id),
  kind TEXT NOT NULL CHECK (kind IN ('impression', 'click')),
  placement TEXT NOT NULL,
  content TEXT NOT NULL,
  day TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (booking_id, kind, placement, content, day)
) WITHOUT ROWID;

ALTER TABLE bookings ADD COLUMN stats_token TEXT;
UPDATE bookings SET stats_token = lower(hex(randomblob(18))) WHERE stats_token IS NULL;
CREATE UNIQUE INDEX bookings_by_stats_token ON bookings (stats_token) WHERE stats_token IS NOT NULL;
