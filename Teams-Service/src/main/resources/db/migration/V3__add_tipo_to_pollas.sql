-- V3__add_tipo_to_pollas.sql
-- Agrega el campo 'tipo' a la tabla pollas para diferenciar entre pollas públicas y privadas

ALTER TABLE pollas
ADD COLUMN tipo VARCHAR(20) NOT NULL DEFAULT 'PRIVADA';

-- Crear un check constraint para validar los valores permitidos
ALTER TABLE pollas
ADD CONSTRAINT chk_polla_tipo CHECK (tipo IN ('PRIVADA', 'PUBLICA'));

-- Crear un índice para mejorar las consultas de pollas públicas
CREATE INDEX idx_pollas_tipo ON pollas(tipo);

-- Comentarios
COMMENT ON COLUMN pollas.tipo IS 'Tipo de polla: PRIVADA (solo grupos invitados) o PUBLICA (cualquier usuario con pago)';
