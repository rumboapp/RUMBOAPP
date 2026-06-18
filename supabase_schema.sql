-- Schema SQL para configurar tu base de datos de Supabase para la aplicación RUMBO
-- Copia todo este código y pégalo en el "SQL Editor" de tu panel de Supabase y presiona "Run" (Ejecutar).

-- 1. Tabla de Usuarios (users)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT
);

-- 2. Tabla de Agencias (agencies)
CREATE TABLE IF NOT EXISTS agencies (
  id TEXT PRIMARY KEY,
  owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  join_code TEXT UNIQUE,
  logo_url TEXT,
  city TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  subscription_plan TEXT DEFAULT 'free',
  whatsapp_template TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Miembros de Agencia (agency_members)
CREATE TABLE IF NOT EXISTS agency_members (
  id TEXT PRIMARY KEY,
  agency_id TEXT REFERENCES agencies(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'admin' o 'guia'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Actividades (activities)
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  agency_id TEXT REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER,
  price DOUBLE PRECISION,
  currency TEXT DEFAULT 'CLP',
  capacity_max INTEGER,
  meeting_point TEXT,
  photo_url TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla de Guías (guides)
CREATE TABLE IF NOT EXISTS guides (
  id TEXT PRIMARY KEY,
  agency_id TEXT REFERENCES agencies(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  specialties TEXT[], -- Arreglo de especialidades
  active BOOLEAN DEFAULT TRUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabla de Salidas / Salidas Programadas (departures)
CREATE TABLE IF NOT EXISTS departures (
  id TEXT PRIMARY KEY,
  agency_id TEXT REFERENCES agencies(id) ON DELETE CASCADE,
  activity_id TEXT REFERENCES activities(id) ON DELETE CASCADE,
  guide_id TEXT REFERENCES guides(id) ON DELETE SET NULL,
  guide_ids TEXT[], -- Para agencias que asignan múltiples guías
  departure_date TEXT NOT NULL, -- Formato 'YYYY-MM-DD'
  departure_time TEXT NOT NULL, -- Formato 'HH:MM'
  status TEXT DEFAULT 'programada', -- 'programada', 'en_curso', 'finalizada', 'cancelada'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabla de Pasajeros / Clientes (passengers)
CREATE TABLE IF NOT EXISTS passengers (
  id TEXT PRIMARY KEY,
  departure_id TEXT REFERENCES departures(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  pax_count INTEGER DEFAULT 1,
  checked_in BOOLEAN DEFAULT FALSE,
  notes TEXT,
  age INTEGER,
  has_minor BOOLEAN DEFAULT FALSE,
  minor_name TEXT,
  minor_age INTEGER,
  dietary_restrictions TEXT,
  medical_issues TEXT,
  emergency_phone TEXT,
  custom_price DOUBLE PRECISION,
  signed_risk_waiver BOOLEAN DEFAULT FALSE,
  signature_data TEXT,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabla de Notificaciones (notifications)
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  agency_id TEXT REFERENCES agencies(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- 'departure_created', 'system', 'weather_alert'
  title TEXT NOT NULL,
  message TEXT,
  departure_id TEXT REFERENCES departures(id) ON DELETE SET NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- OPCIONAL: Desactivar RLS (Row Level Security) para simplificar pruebas iniciales.
-- Si deseas producción segura, te sugerimos configurar políticas RLS para filtrar por agency_id o user_id.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE departures ENABLE ROW LEVEL SECURITY;
ALTER TABLE passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Crear políticas permisivas para pruebas rápidas de lectura/escritura pública (puedes refinarlas después)
DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados y anonimos en users" ON users;
CREATE POLICY "Permitir todo a usuarios autenticados y anonimos en users" ON users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados y anonimos en agencies" ON agencies;
CREATE POLICY "Permitir todo a usuarios autenticados y anonimos en agencies" ON agencies FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados y anonimos en agency_members" ON agency_members;
CREATE POLICY "Permitir todo a usuarios autenticados y anonimos en agency_members" ON agency_members FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados y anonimos en activities" ON activities;
CREATE POLICY "Permitir todo a usuarios autenticados y anonimos en activities" ON activities FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados y anonimos en guides" ON guides;
CREATE POLICY "Permitir todo a usuarios autenticados y anonimos en guides" ON guides FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados y anonimos en departures" ON departures;
CREATE POLICY "Permitir todo a usuarios autenticados y anonimos en departures" ON departures FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados y anonimos en passengers" ON passengers;
CREATE POLICY "Permitir todo a usuarios autenticados y anonimos en passengers" ON passengers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados y anonimos en notifications" ON notifications;
CREATE POLICY "Permitir todo a usuarios autenticados y anonimos en notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
