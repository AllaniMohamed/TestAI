package org.example.userservice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import lombok.Data;

/**
 * Configuration pour le stockage des fichiers
 */
@Configuration
@ConfigurationProperties(prefix = "file.upload")
@Data
public class FileStorageConfig {

    /**
     * Répertoire de stockage des fichiers uploadés
     */
    private String dir = "./uploads/avatars";

    /**
     * URL de base pour accéder aux fichiers
     */
    private String baseUrl = "http://localhost:8888/user-service/api/users/avatars";
}