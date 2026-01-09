package io.github.giovanny.notifications.exception;

public class ProviderNotConfiguredException extends RuntimeException {
    
    public ProviderNotConfiguredException(String message) {
        super(message);
    }
    
    public ProviderNotConfiguredException(String message, Throwable cause) {
        super(message, cause);
    }
}
