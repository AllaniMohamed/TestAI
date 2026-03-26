package org.example.userservice.exception;

/**
 * Exception levée lors d'erreurs de stockage de fichiers
 */
public class FileStorageException extends RuntimeException {

    public FileStorageException(String message) {
        super(message);
    }

    public FileStorageException(String message, Throwable cause) {
        super(message, cause);
    }
}