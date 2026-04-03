package org.example.executionservice.dto;


import lombok.Data;
import java.util.Map;
import java.util.UUID;

@Data
public class TestDTO {
    private UUID id;
    private UUID projectId;
    private UUID endpointId;
    private String endpointPath;
    private Map<String, Object> positive;
    private Map<String, Object> wrongType;
    private Map<String, Object> missingFields;
    private Map<String, Object> boundary;
    private Map<String, Object> validation;
    private Map<String, Object> auth;
}