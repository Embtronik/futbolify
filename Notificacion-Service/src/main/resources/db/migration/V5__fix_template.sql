-- Flyway migration V5: Fix EMAIL_VERIFICATION template with Thymeleaf syntax
UPDATE notification_template 
SET body = '<html><body><h1>Verificación</h1><p>Hola <span th:text="${userName}">Usuario</span>, verifica tu correo: <a th:href="${verificationUrl}">Verificar</a></p></body></html>',
    subject = 'Verifica tu correo electrónico'
WHERE template_type = 'EMAIL_VERIFICATION' AND channel = 'EMAIL';
