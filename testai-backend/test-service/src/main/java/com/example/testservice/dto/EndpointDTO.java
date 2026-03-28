package com.example.testservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO pour recevoir les informations d'un endpoint
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EndpointDTO {
    private UUID id;
    private UUID projectId;
    private String method;  // HttpMethod as String
    private String path;
    private String description;
    private String discoveryType;  // DiscoveryType as String
    private String tags;
    private String parameters;
    private String requestBody;
    private String responseBody;
    private String statusCodes;
    private Boolean requiresAuth;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
