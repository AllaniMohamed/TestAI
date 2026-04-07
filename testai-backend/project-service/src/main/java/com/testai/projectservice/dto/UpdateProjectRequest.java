package com.testai.projectservice.dto;

import com.testai.projectservice.entity.Project;
import lombok.Data;

/**
 * DTO pour mettre à jour un projet
 */
@Data
public class UpdateProjectRequest {
    private String name;
    private String description;
    private String projectUrl;
    private String docUrl;
    private Project.AuthType authType;

    // Credentials (optionnels selon authType)
    // BASIC
    private String authUsername;
    private String authPassword;

    // APIKEY
    private String apiKey;
    private String apiKeyHeader;
    private String apiKeyLocation; // "HEADER" ou "QUERY_PARAM"

    // BEARER
    private String bearerToken;
}