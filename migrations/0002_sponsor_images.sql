-- og_image_status: ready (snapshot in R2), none (page has no og:image), failed (fetch or validation failed), declined (advertiser or admin chose no image).
ALTER TABLE bookings ADD COLUMN og_image_key TEXT;
ALTER TABLE bookings ADD COLUMN og_image_status TEXT NOT NULL DEFAULT 'none'
  CHECK (og_image_status IN ('none', 'ready', 'failed', 'declined'));
ALTER TABLE bookings ADD COLUMN og_image_source TEXT;
ALTER TABLE bookings ADD COLUMN og_image_note TEXT;
