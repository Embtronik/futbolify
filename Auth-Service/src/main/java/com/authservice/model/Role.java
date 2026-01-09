package com.authservice.model;

public enum Role {
    USER,                    // Usuario regular del sistema
    GROUP_ADMIN,            // Administrador de grupos (crea y gestiona grupos)
    SYSTEM_ADMIN            // Administrador del sistema (todos los permisos)
}
