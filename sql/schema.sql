-- Schema for library-seat

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  account_id TEXT UNIQUE,
  name TEXT,
  email TEXT,
  password_hash TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  floor INT,
  capacity INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS seats (
  id SERIAL PRIMARY KEY,
  room_id INT REFERENCES rooms(id) ON DELETE CASCADE,
  label TEXT,
  x INT,
  y INT,
  attributes JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  seat_id INT REFERENCES seats(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed', -- confirmed, cancelled, checked_in, completed
  checked_in BOOLEAN DEFAULT FALSE,
  checkin_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_seat_time ON bookings(seat_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_bookings_user_active ON bookings(user_id, status, start_at, end_at);
