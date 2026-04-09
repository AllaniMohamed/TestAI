package org.example.executionservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "api_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApiRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "method", nullable = false, length = 10)
    private HttpMethod method;

    @Column(name = "url", nullable = false, length = 2000)
    private String url;

    // Headers personnalisés
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "headers", columnDefinition = "jsonb")
    private Map<String, String> headers;

    // Query parameters
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "query_params", columnDefinition = "jsonb")
    private Map<String, String> queryParams;

    // Path variables (pour remplacer {id} dans l'URL)
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "path_variables", columnDefinition = "jsonb")
    private Map<String, String> pathVariables;

    // Type d'authentification
    @Enumerated(EnumType.STRING)
    @Column(name = "auth_type", nullable = false, length = 20)
    private AuthType authType;

    // Configuration d'authentification (Bearer token, Basic username/password, etc.)
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "auth_config", columnDefinition = "jsonb")
    private Map<String, String> authConfig;

    // Corps de la requête (JSON)
    @Column(name = "request_body", columnDefinition = "TEXT")
    private String requestBody;

    // Métadonnées
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "last_executed_at")
    private Instant lastExecutedAt;

    @Column(name = "execution_count", nullable = false)
    private Integer executionCount = 0;

    // Enums internes
    public enum HttpMethod {
        GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
    }

    public enum AuthType {
        NONE,           // Pas d'authentification
        BEARER,         // Bearer Token
        BASIC,          // Basic Auth (username:password)
        API_KEY,        // API Key (header ou query)
        OAUTH2          // OAuth2
    }

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        if (executionCount == null) {
            executionCount = 0;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}