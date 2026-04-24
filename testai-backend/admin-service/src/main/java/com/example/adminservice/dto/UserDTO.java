package com.example.adminservice.dto;

import com.example.adminservice.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

// DTO pour les réponses
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDTO {

    private UUID id;
    private String name;
    private String email;
    private UserRole role;
    private String avatar;
    private String company;
    private String phoneNumber;
    private Boolean isActive;
    private Instant createdAt;
    private Instant lastLogin;
}
