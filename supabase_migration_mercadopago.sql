-- Agregar columnas necesarias para el control real de suscripciones con Mercado Pago
ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS mp_preapproval_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free';

-- Índice para buscar rápido por preapproval_id cuando llega el webhook
CREATE INDEX IF NOT EXISTS idx_agencies_mp_preapproval_id ON agencies(mp_preapproval_id);
