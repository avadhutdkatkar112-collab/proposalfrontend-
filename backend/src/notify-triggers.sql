-- PostgreSQL LISTEN/NOTIFY triggers for real-time admin dashboard
-- Run this against the Supabase database

-- Create the notify function
CREATE OR REPLACE FUNCTION notify_admin_changes()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'admin_changes',
    json_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'id', CASE
        WHEN TG_OP = 'DELETE' THEN OLD.id
        ELSE NEW.id
      END,
      'visitor_id', CASE
        WHEN TG_OP = 'DELETE' THEN OLD.visitor_id
        ELSE NEW.visitor_id
      END
    )::text
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS notify_sessions_changes ON sessions;
DROP TRIGGER IF EXISTS notify_events_changes ON events;

-- Create trigger on sessions table
CREATE TRIGGER notify_sessions_changes
  AFTER INSERT OR UPDATE OR DELETE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_changes();

-- Create trigger on events table
CREATE TRIGGER notify_events_changes
  AFTER INSERT OR DELETE ON events
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_changes();
