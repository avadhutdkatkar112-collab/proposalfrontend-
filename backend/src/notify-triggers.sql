-- Fixed PostgreSQL LISTEN/NOTIFY triggers
-- The trigger fires on BOTH sessions and events tables
-- events table does NOT have visitor_id, so we must check TG_TABLE_NAME

CREATE OR REPLACE FUNCTION notify_admin_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'sessions' THEN
    PERFORM pg_notify(
      'admin_changes',
      json_build_object(
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'id', CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
        'visitor_id', CASE WHEN TG_OP = 'DELETE' THEN OLD.visitor_id ELSE NEW.visitor_id END
      )::text
    );
  ELSIF TG_TABLE_NAME = 'events' THEN
    PERFORM pg_notify(
      'admin_changes',
      json_build_object(
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'id', CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
        'session_id', CASE WHEN TG_OP = 'DELETE' THEN OLD.session_id ELSE NEW.session_id END
      )::text
    );
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers
DROP TRIGGER IF EXISTS notify_sessions_changes ON sessions;
DROP TRIGGER IF EXISTS notify_events_changes ON events;

CREATE TRIGGER notify_sessions_changes
  AFTER INSERT OR UPDATE OR DELETE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_changes();

CREATE TRIGGER notify_events_changes
  AFTER INSERT OR UPDATE OR DELETE ON events
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_changes();
