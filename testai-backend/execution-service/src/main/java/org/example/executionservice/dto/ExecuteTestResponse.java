package org.example.executionservice.dto;

import lombok.Data;
import lombok.Builder;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class ExecuteTestResponse {
    private UUID executionId;
    private String status; // "SUCCESS", "FAILED", "ERROR"
    private Integer statusCode;
    private Boolean passed;
    private Long responseTimeMs;
    private Map<String, Object> responseBody;
    private String errorMessage;
    private Map<String, Object> validationErrors;
}