package org.example.executionservice.dto;

import lombok.*;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExecuteApiRequestDTO {

    private String method;              // GET, POST, PUT, DELETE, PATCH
    private String url;                 // URL complète
    private Map<String, String> headers;
    private Map<String, String> queryParams;
    private Map<String, String> pathVariables;
    private String authType;            // NONE, BEARER, BASIC, API_KEY
    private Map<String, String> authConfig;  // Configuration auth
    private String requestBody;         // JSON body

    // Option pour sauvegarder après exécution
    private Boolean saveAfterExecution;
    private String requestName;
    private String requestDescription;
}