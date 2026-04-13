package org.example.executionservice.dto;

import org.example.executionservice.entity.TestExecution;

public class SimpleTestDTO {
    private String endpointPath = "";
    private final String testType;
    private final String executedAt;
    private final String responseTime;
    private final String statusCodeMatch;
    private final String schemaMatch;
    private final String testStatus;
    private String error = "";

    public SimpleTestDTO(String endpointPath, TestExecution testExecution){
        this(testExecution);
        this.endpointPath = endpointPath;
    }

    public SimpleTestDTO(TestExecution testExecution){
        this.testType = testExecution.getTestType().name();
        this.executedAt = testExecution.getExecutedAt().toString();
        this.responseTime = testExecution.getResponseTimeMs() + " Ms";
        this.statusCodeMatch = testExecution.getStatusCodeMatch().toString();
        this.schemaMatch = testExecution.getSchemaValidationPassed().toString();
        this.testStatus = testExecution.getStatus().name();
        this.error = testExecution.getErrorMessage();
    }

    public String[] toFullStringTable(){
        return new String[]{this.endpointPath, this.testType, this.executedAt,
                this.responseTime, this.statusCodeMatch, this.schemaMatch,
                this.testStatus, this.error};
    }

    public String[] toStringTable(){
        return new String[]{this.testType, this.executedAt,
                this.responseTime, this.statusCodeMatch, this.schemaMatch,
                this.testStatus, this.error};
    }

    public boolean isSimple(){
        return this.endpointPath.isEmpty();
    }
}
