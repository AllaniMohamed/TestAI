package com.testai.projectservice.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.UUID;

@Entity
@Table(name = "api_credentials")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApiCredentials {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne
    @JoinColumn(name = "project_id", nullable = false, unique = true)
    @JsonIgnore  // ⭐ empêche la boucle infinie
    private Project project;

    // Pour BASIC Auth
    @Column(name = "basic_username")
    private String basicUsername;

    @Column(name = "basic_password")
    private String basicPassword;

    // Pour API Key
    @Column(name = "api_key", length = 500)
    private String apiKey;

    @Column(name = "api_key_header", length = 100)
    private String apiKeyHeader; // Ex: "X-API-Key", "api-key", "Authorization"

    @Column(name = "api_key_location")
    @Enumerated(EnumType.STRING)
    private ApiKeyLocation apiKeyLocation; // HEADER ou QUERY_PARAM

    // Pour Bearer Token
    @Column(name = "bearer_token", columnDefinition = "TEXT")
    private String bearerToken;

    // Optionnel: Chiffrement
    @Column(name = "is_encrypted")
    private boolean encrypted = false;

    public enum ApiKeyLocation {
        HEADER,       // Dans les headers HTTP
        QUERY_PARAM   // Dans l'URL (?api_key=xxx)
    }
}