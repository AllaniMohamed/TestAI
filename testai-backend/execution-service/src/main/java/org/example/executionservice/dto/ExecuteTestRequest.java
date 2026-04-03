package org.example.executionservice.dto;


import lombok.Data;
import java.util.UUID;

@Data
public class ExecuteTestRequest {
    private UUID projectId;
    private UUID endpointId;
    private String testType; // "POSITIVE", "WRONG_TYPE", etc.
    private UUID executedBy; // UserId
}