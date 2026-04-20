package com.example.adminservice.dto;

import com.example.adminservice.enums.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SharedAccessDTO {
    private UUID id;
    private UUID projectId;
    private UUID userId;
    private String userEmail;
    private String userName;
    private AccessStatus status;
    private AccessLevel accessLevel;
    private UUID sharedBy;
    private String sharedByEmail;
    private String sharedByName;
    private LocalDateTime invitedAt;
    private LocalDateTime activatedAt;
    private LocalDateTime createdAt;
}