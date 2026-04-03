package org.example.executionservice.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class ExecuteProjectRequest {
    private UUID projectId;
    private UUID executedBy;
    private String executionContext; // "manual", "scheduled", "ci_cd"
}