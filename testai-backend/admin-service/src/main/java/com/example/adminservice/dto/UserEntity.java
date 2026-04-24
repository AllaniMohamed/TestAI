package com.example.adminservice.dto;

import com.example.adminservice.enums.UserRole;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Data
public class UserEntity {

    private UUID id;
    private String name;
    private String email;
    private UserRole role;
    private String keycloakId;
    private String avatar;
    private String company;
    private Boolean isActive;

    private Instant createdAt;
    private Instant updatedAt;
    private Instant lastLogin;

    private Boolean emailVerified;
    private String emailVerificationToken;
    private Instant verificationTokenExpiresAt;
    private String tempPassword;
    private String phoneNumber; // Format international : +33612345678
    private Boolean phoneVerified;

    private String phoneVerificationCode;

    private Instant phoneVerificationCodeExpiresAt;
    private Integer phoneVerificationAttempts;
    private Instant phoneVerificationSentAt;

    private String passwordResetToken;

    private Instant passwordResetTokenExpiresAt;

    private Integer passwordResetAttempts;

    private Instant passwordResetRequestedAt;

}