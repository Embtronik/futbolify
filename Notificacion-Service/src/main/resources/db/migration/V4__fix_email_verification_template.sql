-- V4__fix_email_verification_template.sql
-- Corrige sintaxis del template EMAIL_VERIFICATION para usar Thymeleaf inline syntax
-- Sintaxis [[${variable}]] funciona con StringTemplateResolver

UPDATE notification_template
SET body = '<html><body><h1>Verificación</h1><p>Hola [[${userName}]], verifica tu correo: <a th:href="@{${verificationUrl}}">Verificar</a></p></body></html>',
    updated_at = NOW(),
    updated_by = 'system',
    version = version + 1
WHERE template_type = 'EMAIL_VERIFICATION' AND channel = 'EMAIL';
