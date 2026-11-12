-- Apply once to a dedicated D1 database. Reapplying preserves the cumulative total.
CREATE TABLE IF NOT EXISTS view_totals (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  total INTEGER NOT NULL DEFAULT 0 CHECK (total >= 0)
);
INSERT OR IGNORE INTO view_totals (id, total) VALUES (1, 0);
CREATE TABLE IF NOT EXISTS view_cooldowns (
  visitor_hash TEXT PRIMARY KEY,
  last_seen INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS view_cooldowns_expiry ON view_cooldowns(last_seen);
CREATE TRIGGER IF NOT EXISTS count_first_view AFTER INSERT ON view_cooldowns
BEGIN
  UPDATE view_totals SET total = total + 1 WHERE id = 1;
END;
CREATE TRIGGER IF NOT EXISTS count_return_view AFTER UPDATE ON view_cooldowns
WHEN NEW.last_seen - OLD.last_seen > 10000
BEGIN
  UPDATE view_totals SET total = total + 1 WHERE id = 1;
END;