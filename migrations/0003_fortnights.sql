-- Bookings now cover a fortnight aligned to Monday 2026-01-05 UTC. week_start becomes period_start, snapped to its fortnight.
DROP INDEX bookings_one_claim_per_week;
DROP INDEX bookings_by_status;

ALTER TABLE bookings RENAME COLUMN week_start TO period_start;

UPDATE bookings
SET period_start = date('2026-01-05', printf('+%d days', 14 * CAST((julianday(period_start) - julianday('2026-01-05')) / 14 AS INTEGER)))
WHERE julianday(period_start) >= julianday('2026-01-05');

-- Two weekly holds can land in the same fortnight; keep the oldest, release the rest. Paid duplicates would make the index below fail loudly.
UPDATE bookings
SET status = 'expired', updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE status = 'holding'
  AND EXISTS (
    SELECT 1 FROM bookings AS other
    WHERE other.placement_id = bookings.placement_id
      AND other.period_start = bookings.period_start
      AND other.status IN ('holding', 'in_review', 'scheduled')
      AND (other.created_at < bookings.created_at OR (other.created_at = bookings.created_at AND other.id < bookings.id))
  );

CREATE UNIQUE INDEX bookings_one_claim_per_period
  ON bookings (placement_id, period_start)
  WHERE status IN ('holding', 'in_review', 'scheduled');

CREATE INDEX bookings_by_status ON bookings (status, period_start);
