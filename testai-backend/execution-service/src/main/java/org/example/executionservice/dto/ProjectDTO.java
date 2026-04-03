package org.example.executionservice.dto;


import lombok.Data;
import java.util.UUID;

@Data
public class ProjectDTO {
    private UUID id;
    private String name;
    private String projectUrl; // Base URL de l'API
    private String authType; // "NONE", "BASIC", "APIKEY", "BEARER"
    private ApiCredentialsDTO credentials;
}