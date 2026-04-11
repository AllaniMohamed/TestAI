package org.example.executionservice.dto;

import lombok.Getter;
import org.example.executionservice.entity.TestExecution;

public class SimpleTestDTO {
    private final String endpointPath;
    private final String testType;
    private final String executedAt;
    private final String responseTime;
    private final String statusCodeMatch;
    private final String schemaMatch;
    private final String testStatus;
    private String error = "";

    public SimpleTestDTO(String endpointPath, TestExecution testExecution){
        this.endpointPath = endpointPath;
        this.testType = testExecution.getTestType().name();
        this.executedAt = testExecution.getExecutedAt().toString();
        this.responseTime = testExecution.getResponseTimeMs() + " Ms";
        this.statusCodeMatch = testExecution.getStatusCodeMatch().toString();
        this.schemaMatch = testExecution.getSchemaValidationPassed().toString();
        this.testStatus = testExecution.getStatus().name();
        this.error = testExecution.getErrorMessage();
    }

    public String[] toStringTable(){
        return new String[]{this.endpointPath, this.testType, this.executedAt,
                this.responseTime, this.statusCodeMatch, this.schemaMatch,
                this.testStatus, this.error};
    }
}
