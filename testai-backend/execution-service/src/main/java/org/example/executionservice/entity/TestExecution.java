package org.example.executionservice.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "test_executions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestExecution {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID projectId;

    @Column(nullable = false)
    private UUID endpointId;

    @Column(nullable = false)
    private String endpointPath;

    @Column(nullable = false)
    private String httpMethod; // GET, POST, PUT, DELETE

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private TestType testType; // POSITIVE, WRONG_TYPE, MISSING_FIELDS, etc.

    // ========================================
    // REQUÊTE ENVOYÉE
    // ========================================

    @Column(nullable = false, columnDefinition = "TEXT")
    private String requestUrl; // URL complète

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, String> requestHeaders; // Headers envoyés

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> requestBody; // Payload envoyé

    // ========================================
    // RÉPONSE REÇUE
    // ========================================

    @Column(nullable = false)
    private Integer responseStatusCode; // 200, 201, 400, 401, etc.

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, String> responseHeaders; // Headers reçus

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> responseBody; // Body reçu

    @Column
    private Long responseTimeMs; // Temps de réponse en millisecondes

    // ========================================
    // RÉSULTAT DU TEST
    // ========================================

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private TestStatus status; // SUCCESS, FAILED, ERROR

    @Column
    private Integer expectedStatusCode; // Code attendu

    @Column
    private Boolean statusCodeMatch; // true si code correspond

    @Column
    private Boolean schemaValidationPassed; // true si schéma valide

    @Column(columnDefinition = "TEXT")
    private String errorMessage; // Message d'erreur si échec

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> validationErrors; // Détails erreurs validation

    // ========================================
    // MÉTADONNÉES
    // ========================================

    @Column(nullable = false)
    private UUID executedBy; // UserId qui a lancé le test

    @CreationTimestamp
    @Column(nullable = false)
    private Instant executedAt;

    @Column
    private String executionContext; // "manual", "scheduled", "ci_cd"

    @Column(name = "execution_id", nullable = false)
    private UUID executionId;
    public enum TestType {
        POSITIVE,
        WRONG_TYPE,
        MISSING_FIELDS,
        VALIDATION,
        BOUNDARY,
        AUTH
    }

    public enum TestStatus {
        SUCCESS,   // Test passé comme attendu
        FAILED,    // Test échoué (réponse != attendu)
        ERROR      // Erreur technique (timeout, connexion, etc.)
    }
}