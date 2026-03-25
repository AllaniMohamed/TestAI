package com.testai.projectservice.entity;

import jakarta.persistence.*;
import lombok.*;

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
