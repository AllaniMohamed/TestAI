package com.example.adminservice.dto;


import lombok.Data;

@Data
public class ApiCredentialsDTO {
    private String basicUsername;
    private String basicPassword;
    private String apiKey;
    private String apiKeyHeader; // Ex: "X-API-Key"
    private String apiKeyLocation; // "HEADER" ou "QUERY_PARAM"
    private String bearerToken;
}