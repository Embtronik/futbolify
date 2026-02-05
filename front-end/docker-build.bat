@echo off
REM Script para construir y ejecutar la imagen Docker del frontend en Windows

echo Construyendo imagen Docker del frontend...
docker build -t football-team-manager-frontend:latest .

if %errorlevel% equ 0 (
    echo.
    echo Imagen construida exitosamente
    echo.
    echo Para ejecutar el contenedor:
    echo   docker run -d -p 80:80 --name football-frontend football-team-manager-frontend:latest
    echo.
    echo Para ver logs:
    echo   docker logs -f football-frontend
    echo.
    echo Para detener y eliminar:
    echo   docker stop football-frontend ^&^& docker rm football-frontend
) else (
    echo.
    echo Error al construir la imagen
    exit /b 1
)
