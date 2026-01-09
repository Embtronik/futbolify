-- Migración V1: Crear tabla notification_log para auditoría de notificaciones
CREATE TABLE notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel VARCHAR(20) NOT NULL,
    provider VARCHAR(50),
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    body TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMP
);

-- Índices para mejorar consultas
CREATE INDEX idx_notification_log_status ON notification_log(status);
CREATE INDEX idx_notification_log_created_at ON notification_log(created_at);
CREATE INDEX idx_notification_log_recipient ON notification_log(recipient);
CREATE INDEX idx_notification_log_channel ON notification_log(channel);

-- Comentarios para documentación
COMMENT ON TABLE notification_log IS 'Registro de auditoría de todas las notificaciones enviadas';
COMMENT ON COLUMN notification_log.channel IS 'Canal de comunicación: EMAIL, WHATSAPP, SMS';
COMMENT ON COLUMN notification_log.provider IS 'Proveedor utilizado: TWILIO, SENDGRID, etc.';
COMMENT ON COLUMN notification_log.status IS 'Estado: PENDING, SENT, FAILED, RETRYING';
COMMENT ON COLUMN notification_log.metadata IS 'Información adicional en formato JSON';
