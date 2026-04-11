package com.testai.projectservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "projects")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Project {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private String projectUrl;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private DocsMode docMode;

    @Column(nullable = false)
    private String docUrl;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private AuthType authType;

    // ⭐ NOUVEAU : Activation/Désactivation
    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    // ⭐ NOUVEAU : Dates d'activation/désactivation
    private LocalDateTime activatedAt;
    private LocalDateTime deactivatedAt;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    // ========== RELATION AVEC CREDENTIALS ==========
    @OneToOne(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    private ApiCredentials credentials;
    // ================================================

    public enum DocsMode {
        SWAGGER, MANUAL
    }

    public enum AuthType {
        NONE, BASIC, APIKEY, BEARER
    }
}