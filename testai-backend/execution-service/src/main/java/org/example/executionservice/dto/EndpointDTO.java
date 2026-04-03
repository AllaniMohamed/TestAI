package org.example.executionservice.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class EndpointDTO {
    private UUID id;
    private UUID projectId;
    private String method; // "GET", "POST", "PUT", "DELETE"
    private String path; // "/api/users"
    private String requestBodySchema; // JSON Schema
    private String responseBodySchema; // JSON Schema
    private Boolean requiresAuth;
}