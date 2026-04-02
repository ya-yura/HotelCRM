CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  timezone TEXT NOT NULL,
  currency TEXT NOT NULL,
  address TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS users_property_role_idx ON users (property_id, role);
CREATE INDEX IF NOT EXISTS users_property_active_idx ON users (property_id, active);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS auth_sessions_property_user_idx ON auth_sessions (property_id, user_id);

CREATE TABLE IF NOT EXISTS guests (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS guests_property_name_idx ON guests (property_id, full_name);
CREATE INDEX IF NOT EXISTS guests_property_phone_idx ON guests (property_id, phone);

CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  room_label TEXT NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  status TEXT NOT NULL,
  balance_due NUMERIC(12, 2) NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS reservations_property_dates_idx ON reservations (property_id, check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS reservations_property_status_idx ON reservations (property_id, status);

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  room_number TEXT NOT NULL,
  room_type TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS rooms_property_status_idx ON rooms (property_id, status);
CREATE INDEX IF NOT EXISTS rooms_property_number_idx ON rooms (property_id, room_number);

CREATE TABLE IF NOT EXISTS housekeeping_tasks (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  room_number TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS housekeeping_tasks_property_status_idx ON housekeeping_tasks (property_id, status);
CREATE INDEX IF NOT EXISTS housekeeping_tasks_property_room_idx ON housekeeping_tasks (property_id, room_id, status);

CREATE TABLE IF NOT EXISTS maintenance_incidents (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  room_number TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS maintenance_incidents_property_status_idx ON maintenance_incidents (property_id, status);

CREATE TABLE IF NOT EXISTS folios (
  reservation_id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  status TEXT NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(12, 2) NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS folios_property_status_idx ON folios (property_id, status);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  reservation_id TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL,
  method TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS payments_property_received_idx ON payments (property_id, received_at DESC);

CREATE TABLE IF NOT EXISTS stays (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  reservation_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  status TEXT NOT NULL,
  checked_in_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS stays_property_room_status_idx ON stays (property_id, room_id, status);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_logs_property_entity_idx ON audit_logs (property_id, entity_type, entity_id);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  status TEXT NOT NULL,
  local_version INTEGER NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sync_queue_property_status_idx ON sync_queue (property_id, status, updated_at);

CREATE TABLE IF NOT EXISTS sync_conflicts (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sync_conflicts_property_entity_idx ON sync_conflicts (property_id, entity_type, entity_id);

CREATE TABLE IF NOT EXISTS assistant_items (
  id TEXT PRIMARY KEY,
  item_type TEXT NOT NULL,
  title TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notification_deliveries_property_status_idx ON notification_deliveries (property_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS compliance_submissions (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS compliance_submissions_property_status_idx ON compliance_submissions (property_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS background_jobs (
  id TEXT PRIMARY KEY,
  property_id TEXT,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL,
  run_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS background_jobs_status_run_idx ON background_jobs (status, run_at);

CREATE TABLE IF NOT EXISTS az_rooms (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  room_number TEXT NOT NULL,
  room_type TEXT NOT NULL,
  status TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS az_rooms_property_number_idx ON az_rooms (property_id, room_number);

CREATE TABLE IF NOT EXISTS az_bookings (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  guest_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  status TEXT NOT NULL,
  channel TEXT NOT NULL,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS az_bookings_property_dates_idx ON az_bookings (property_id, check_in_date, check_out_date);

CREATE TABLE IF NOT EXISTS az_guests (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS az_guests_property_name_idx ON az_guests (property_id, name);

CREATE TABLE IF NOT EXISTS az_housekeeping_tasks (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  task_date DATE NOT NULL,
  status TEXT NOT NULL,
  assignee TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS az_housekeeping_tasks_property_status_idx ON az_housekeeping_tasks (property_id, status, task_date DESC);

CREATE TABLE IF NOT EXISTS az_report_data (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  report_date DATE NOT NULL,
  occupancy_rate NUMERIC(6, 2) NOT NULL DEFAULT 0,
  revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
  bookings INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS az_report_data_property_date_idx ON az_report_data (property_id, report_date DESC);

CREATE TABLE IF NOT EXISTS az_channel_sync_records (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS az_channel_sync_records_room_idx ON az_channel_sync_records (property_id, room_id, synced_at DESC);
