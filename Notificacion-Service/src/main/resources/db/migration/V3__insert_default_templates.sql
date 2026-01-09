-- V3__insert_default_templates.sql
-- Inserta templates por defecto para notificaciones

-- Template EMAIL_VERIFICATION para EMAIL
INSERT INTO notification_template (
    template_type, channel, name, description, subject, body, expected_variables, is_active, version, created_at, created_by
) VALUES (
    'EMAIL_VERIFICATION', 'EMAIL', 'Email de Verificación', 'Template para verificación de correo electrónico', 
    'Verifica tu correo electrónico',
    '<html><body><h1>Verificación</h1><p>Hola {{userName}}, verifica tu correo: <a href="{{verificationUrl}}">Verificar</a></p></body></html>',
    '["userName", "verificationUrl", "expirationTime"]', true, 1, NOW(), 'system'
) ON CONFLICT (template_type, channel) WHERE is_active DO NOTHING;

-- Template PASSWORD_RESET para EMAIL
INSERT INTO notification_template (
    template_type, channel, name, description, subject, body, expected_variables, is_active, version, created_at, created_by
) VALUES (
    'PASSWORD_RESET', 'EMAIL', 'Recuperación de Contraseña', 'Template para restablecer contraseña',
    'Restablece tu contraseña',
    '<html><body><h1>Restablecer Contraseña</h1><p>Hola {{userName}}, <a href="{{resetUrl}}">Restablecer contraseña</a>. Válido por {{expirationTime}}.</p></body></html>',
    '["userName", "resetUrl", "expirationTime"]', true, 1, NOW(), 'system'
) ON CONFLICT (template_type, channel) WHERE is_active DO NOTHING;

-- Template WELCOME para EMAIL
INSERT INTO notification_template (
    template_type, channel, name, description, subject, body, expected_variables, is_active, version, created_at, created_by
) VALUES (
    'WELCOME', 'EMAIL', 'Bienvenida', 'Template de bienvenida',
    'Bienvenido a {{appName}}',
    '<html><body><h1>¡Bienvenido!</h1><p>Hola {{userName}}, bienvenido a {{appName}}. <a href="{{appUrl}}">Comenzar</a></p></body></html>',
    '["userName", "appName", "appUrl"]', true, 1, NOW(), 'system'
) ON CONFLICT (template_type, channel) WHERE is_active DO NOTHING;

-- Template NOTIFICATION para EMAIL (genérico)
INSERT INTO notification_template (
    template_type, channel, name, description, subject, body, expected_variables, is_active, version, created_at, created_by
) VALUES (
    'NOTIFICATION', 'EMAIL', 'Notificación General', 'Template genérico',
    '{{subject}}',
    '<html><body><h1>{{title}}</h1><p>{{message}}</p></body></html>',
    '["subject", "title", "message"]', true, 1, NOW(), 'system'
) ON CONFLICT (template_type, channel) WHERE is_active DO NOTHING;

-- Template EMAIL_VERIFICATION para SMS
INSERT INTO notification_template (
    template_type, channel, name, description, subject, body, expected_variables, is_active, version, created_at, created_by
) VALUES (
    'EMAIL_VERIFICATION', 'SMS', 'Código SMS', 'Código de verificación por SMS',
    NULL,
    'Hola {{userName}}, tu código: {{verificationCode}}. Válido {{expirationTime}}.',
    '["userName", "verificationCode", "expirationTime"]', true, 1, NOW(), 'system'
) ON CONFLICT (template_type, channel) WHERE is_active DO NOTHING;

-- Template EMAIL_VERIFICATION para WHATSAPP
INSERT INTO notification_template (
    template_type, channel, name, description, subject, body, expected_variables, is_active, version, created_at, created_by
) VALUES (
    'EMAIL_VERIFICATION', 'WHATSAPP', 'Código WhatsApp', 'Código de verificación por WhatsApp',
    NULL,
    '¡Hola *{{userName}}*! 👋\n\nTu código: *{{verificationCode}}*\n⏰ Válido: {{expirationTime}}',
    '["userName", "verificationCode", "expirationTime"]', true, 1, NOW(), 'system'
) ON CONFLICT (template_type, channel) WHERE is_active DO NOTHING;
