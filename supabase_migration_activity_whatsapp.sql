-- Ejecutar en el SQL Editor de Supabase para habilitar plantillas de WhatsApp por actividad.
ALTER TABLE activities ADD COLUMN IF NOT EXISTS whatsapp_template TEXT;
