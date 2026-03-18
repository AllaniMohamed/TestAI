package com.testai.projectservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "shared_access")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SharedAccess {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID projectId;

    // ⭐ MODIFICATION : userId peut être NULL
    @Column(nullable = true)  // ⭐ Changé de false à true
    private UUID userId;

    // ⭐ NOUVEAU : Stocker l'email directement
    @Column(nullable = false)
    private String developerEmail;

    @Column(unique = true, nullable = false)
    private String invitationToken;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AccessStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AccessLevel accessLevel;

    @Column(nullable = false)
    private UUID sharedBy;

    @Column(name = "shared_by_email", nullable = false)
    private String sharedByEmail;

    private LocalDateTime invitedAt;
    private LocalDateTime activatedAt;
    private LocalDateTime revokedAt;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

}