-- Migración V2: Crear tabla notification_template para gestión de plantillas
CREATE TABLE notification_template (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description VARCHAR(500),
    subject VARCHAR(500),
    body TEXT NOT NULL,
    expected_variables TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

-- Índices para mejorar consultas
CREATE INDEX idx_template_type_channel ON notification_template(template_type, channel);
CREATE INDEX idx_template_active ON notification_template(is_active);
CREATE INDEX idx_template_channel ON notification_template(channel);

-- Constraint único: solo un template activo por tipo y canal
CREATE UNIQUE INDEX idx_unique_active_template 
ON notification_template(template_type, channel) 
WHERE is_active = true;

-- Comentarios para documentación
COMMENT ON TABLE notification_template IS 'Plantillas de notificaciones con soporte para variables dinámicas';
COMMENT ON COLUMN notification_template.template_type IS 'Tipo de template: WELCOME_EMAIL, ORDER_CONFIRMATION, etc.';
COMMENT ON COLUMN notification_template.body IS 'Contenido del template con variables Thymeleaf: [[${variable}]]';
COMMENT ON COLUMN notification_template.expected_variables IS 'Array JSON de variables esperadas: ["userName", "link"]';
COMMENT ON COLUMN notification_template.is_active IS 'Solo templates activos pueden ser utilizados';

-- Insertar templates de ejemplo
INSERT INTO notification_template (template_type, channel, name, description, subject, body, expected_variables, is_active, version, created_by) 
VALUES 
('WELCOME_EMAIL', 'EMAIL', 'Email de Bienvenida', 'Email enviado al registrarse en la plataforma', 
 'Bienvenido a Notificación Service, [[${userName}]]!',
 '<html><body><h1>¡Hola [[${userName}]]!</h1><p>Bienvenido a nuestra plataforma. Gracias por registrarte.</p><p>Para activar tu cuenta, haz clic en el siguiente enlace:</p><a href="[[${activationLink}]]">Activar Cuenta</a></body></html>',
 '["userName", "activationLink"]', true, 1, 'system'),

('ORDER_CONFIRMATION', 'EMAIL', 'Confirmación de Pedido', 'Email de confirmación al realizar un pedido',
 'Pedido #[[${orderNumber}]] confirmado',
 '<html><body><h2>¡Pedido Confirmado!</h2><p>Hola [[${userName}]],</p><p>Tu pedido #[[${orderNumber}]] ha sido confirmado exitosamente.</p><p>Total: $[[${totalAmount}]]</p><p>Recibirás una notificación cuando sea enviado.</p></body></html>',
 '["userName", "orderNumber", "totalAmount"]', true, 1, 'system'),

('PASSWORD_RESET', 'EMAIL', 'Recuperación de Contraseña', 'Email para restablecer contraseña',
 'Restablece tu contraseña',
 '<html><body><h2>Restablecimiento de Contraseña</h2><p>Hola [[${userName}]],</p><p>Recibimos una solicitud para restablecer tu contraseña.</p><p>Haz clic en el siguiente enlace para continuar:</p><a href="[[${resetLink}]]">Restablecer Contraseña</a><p>Este enlace expira en [[${expirationMinutes}]] minutos.</p><p>Si no solicitaste esto, ignora este mensaje.</p></body></html>',
 '["userName", "resetLink", "expirationMinutes"]', true, 1, 'system'),

('ORDER_CONFIRMATION', 'SMS', 'Confirmación de Pedido (SMS)', 'SMS de confirmación de pedido',
 NULL,
 'Hola [[${userName}]]! Tu pedido #[[${orderNumber}]] por $[[${totalAmount}]] ha sido confirmado. Gracias por tu compra!',
 '["userName", "orderNumber", "totalAmount"]', true, 1, 'system'),

('APPOINTMENT_REMINDER', 'WHATSAPP', 'Recordatorio de Cita', 'Recordatorio de cita por WhatsApp',
 NULL,
 'Hola [[${userName}]]! Te recordamos tu cita para el [[${appointmentDate}]] a las [[${appointmentTime}]]. Ubicación: [[${location}]]. ¡Te esperamos!',
 '["userName", "appointmentDate", "appointmentTime", "location"]', true, 1, 'system');
