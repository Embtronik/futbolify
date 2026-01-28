-- Elimina columna y campos obsoletos de polla_participantes
ALTER TABLE polla_participantes DROP COLUMN IF EXISTS estado;
ALTER TABLE polla_participantes DROP COLUMN IF EXISTS fecha_invitacion;
ALTER TABLE polla_participantes DROP COLUMN IF EXISTS fecha_respuesta;
DROP INDEX IF EXISTS idx_estado_participante;