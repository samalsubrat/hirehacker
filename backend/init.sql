CREATE TABLE IF NOT EXISTS submissions (
  id SERIAL PRIMARY KEY,
  user_id UUID,
  code TEXT NOT NULL,
  language VARCHAR(50),
  result TEXT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
