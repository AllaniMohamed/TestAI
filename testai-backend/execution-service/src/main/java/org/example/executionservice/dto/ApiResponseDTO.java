package org.example.executionservice.dto;

import lombok.*;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApiResponseDTO {

    private Integer status;
    private String statusText;
    private Map<String, String> headers;
    private String body;                // Response body (JSON ou texte)
    private Long responseTimeMs;
    private String size;                // Taille formatée (ex: "1.2KB")
    private Boolean success;
    private String errorMessage;
}