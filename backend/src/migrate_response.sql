-- Add response columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'response') THEN
    ALTER TABLE sessions ADD COLUMN response VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'responded_at') THEN
    ALTER TABLE sessions ADD COLUMN responded_at TIMESTAMPTZ;
  END IF;
END $$;
