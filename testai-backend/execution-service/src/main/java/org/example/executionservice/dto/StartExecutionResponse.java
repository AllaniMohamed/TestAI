package org.example.executionservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.UUID;

@Data
@AllArgsConstructor
public class StartExecutionResponse {
    private UUID executionId;
}