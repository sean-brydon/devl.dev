-- Prices live in src/lib/sponsors.ts; this table pins the valid placement ids.
CREATE TABLE placements (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

INSERT INTO placements (id, label) VALUES
  ('grid:component', 'Components grid'),
  ('grid:block', 'Blocks grid'),
  ('grid:screen', 'Screens grid'),
  ('grid:motion', 'Motion grid'),
  ('grid:illustration', 'Illustrations grid'),
  ('item', 'Every item page');

CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  placement_id TEXT NOT NULL REFERENCES placements (id),
  week_start TEXT NOT NULL CHECK (week_start GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  status TEXT NOT NULL CHECK (status IN ('holding', 'in_review', 'scheduled', 'refunded', 'expired')),
  product_name TEXT NOT NULL,
  pitch TEXT NOT NULL,
  url TEXT NOT NULL,
  email TEXT NOT NULL,
  accent TEXT NOT NULL,
  monogram TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_refund_id TEXT,
  hold_expires_at INTEGER NOT NULL,
  paid_at INTEGER,
  reviewed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- One live claim per placement and week: holds, paid-in-review and scheduled bookings block it.
CREATE UNIQUE INDEX bookings_one_claim_per_week
  ON bookings (placement_id, week_start)
  WHERE status IN ('holding', 'in_review', 'scheduled');

CREATE INDEX bookings_by_status ON bookings (status, week_start);
CREATE UNIQUE INDEX bookings_by_session ON bookings (stripe_session_id) WHERE stripe_session_id IS NOT NULL;
