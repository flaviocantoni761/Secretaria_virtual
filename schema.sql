-- Schema: Secretária Virtual (multi-usuário)

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  whatsapp_number VARCHAR(20) UNIQUE NOT NULL, -- ex: 5511999999999
  name VARCHAR(120),
  timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  phone_number VARCHAR(20), -- número pra ligação (Twilio Voice)
  whatsapp_number VARCHAR(20), -- número pra mensagem
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, notified, done, cancelled
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  category VARCHAR(60) NOT NULL, -- mercado, transporte, lazer, saúde, etc.
  spent_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reminders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL, -- se for lembrete de ligar pra alguém
  message TEXT NOT NULL,
  remind_at TIMESTAMP NOT NULL,
  action_type VARCHAR(20) DEFAULT 'whatsapp', -- whatsapp | call
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed, cancelled
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_pending ON reminders (remind_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_appointments_pending ON appointments (scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_expenses_user_category ON expenses (user_id, category);
