package org.example.userservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.Builder;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Entité User avec support de vérification email et téléphone
 */
@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private UserRole role;

    @Column(name = "keycloak_id", unique = true)
    private String keycloakId;

    private String avatar;

    private String company;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "last_login")
    private Instant lastLogin;

    // ========================================
    // CHAMPS POUR VÉRIFICATION EMAIL
    // ========================================

    @Builder.Default
    @Column(name = "email_verified", nullable = false)
    private Boolean emailVerified = false;

    @Column(name = "email_verification_token", unique = true)
    private String emailVerificationToken;

    @Column(name = "verification_token_expires_at")
    private Instant verificationTokenExpiresAt;

    @Column(name = "temp_password")
    private String tempPassword;

    // ========================================
    // CHAMPS POUR VÉRIFICATION TÉLÉPHONE (Twilio Verify)
    // ========================================

    @Column(name = "phone_number", nullable = true)
    private String phoneNumber; // Format international : +33612345678

    @Builder.Default
    @Column(name = "phone_verified", nullable = false)
    private Boolean phoneVerified = false;

    // Ces champs restent NULL avec Twilio Verify (optionnels)
    @Column(name = "phone_verification_code")
    private String phoneVerificationCode;

    @Column(name = "phone_verification_code_expires_at")
    private Instant phoneVerificationCodeExpiresAt;

    // Utilisés pour la gestion locale des tentatives et rate limiting
    @Column(name = "phone_verification_attempts")
    private Integer phoneVerificationAttempts;

    @Column(name = "phone_verification_sent_at")
    private Instant phoneVerificationSentAt;

    // CHAMPS POUR RÉINITIALISATION DE MOT DE PASSE
// ========================================

    /**
     * Token de réinitialisation de mot de passe
     */
    @Column(name = "password_reset_token", unique = true)
    private String passwordResetToken;

    /**
     * Date d'expiration du token de réinitialisation (1 heure)
     */
    @Column(name = "password_reset_token_expires_at")
    private Instant passwordResetTokenExpiresAt;

    /**
     * Nombre de tentatives de réinitialisation (max 3 par heure)
     */
    @Column(name = "password_reset_attempts")
    private Integer passwordResetAttempts;

    /**
     * Date de la dernière demande de réinitialisation
     */
    @Column(name = "password_reset_requested_at")
    private Instant passwordResetRequestedAt;
    /**
     * Hook JPA exécuté avant la première sauvegarde
     */
    @PrePersist
    public void prePersist() {
        if (this.isActive == null) {
            this.isActive = false;
        }
        if (this.emailVerified == null) {
            this.emailVerified = false;
        }
        if (this.phoneVerified == null) {
            this.phoneVerified = false;
        }
        if (this.phoneVerificationAttempts == null) {
            this.phoneVerificationAttempts = 0;
        }
        if (this.passwordResetAttempts == null) {
            this.passwordResetAttempts = 0;
        }
    }

    /**
     * Enum pour les rôles utilisateur
     */
    public enum UserRole {
        ADMIN,
        MANAGER,
        DEVELOPER
    }
}