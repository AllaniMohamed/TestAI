package com.example.adminservice.dto;

import com.example.adminservice.enums.ApiKeyLocation;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApiCredentialsEntity {
    private UUID id;
    private ProjectEntity project;
    private String basicUsername;
    private String basicPassword;
    private String apiKey;
    private String apiKeyHeader; // Ex: "X-API-Key", "api-key", "Authorization"
    private ApiKeyLocation apiKeyLocation; // HEADER ou QUERY_PARAM
    private String bearerToken;
    private boolean encrypted = false;
}