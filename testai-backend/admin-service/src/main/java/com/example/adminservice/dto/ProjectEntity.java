package com.example.adminservice.dto;

import jakarta.persistence.*;
import lombok.*;
import com.example.adminservice.enums.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectEntity {
    private UUID id;
    private UUID userId;
    private String name;
    private String description;
    private String projectUrl;
    private DocsMode docMode;
    private String docUrl;
    private AuthType authType;
    private Boolean isActive = true;

    // ⭐ NOUVEAU : Dates d'activation/désactivation
    private LocalDateTime activatedAt;
    private LocalDateTime deactivatedAt;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    // ========== RELATION AVEC CREDENTIALS ==========
    private ApiCredentialsEntity credentials;
    // ================================================
}