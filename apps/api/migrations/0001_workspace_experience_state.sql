CREATE TABLE IF NOT EXISTS workspace_experience_state (
  workspace_id TEXT PRIMARY KEY,
  schema_version TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version >= 1),
  state_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
