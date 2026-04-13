package org.example.executionservice.dto;

import org.example.executionservice.entity.ProjectExecution;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class ProjectStatsDTO {
    private final Integer totalEndpoints;
    private final Integer totalTests;
    private final Integer testsPassed;
    private final Integer testsFailed;
    private final Integer testsError;
    private Double avgSuccessRate = 0.0;
    private Long avgDurationMs = 0L;

    // Statistiques par type
    private final Integer positiveTests;
    private final Integer positivePassedTests;
    private final Integer wrongTypeTests;
    private final Integer wrongTypePassedTests;
    private final Integer missingFieldsTests;
    private final Integer missingFieldsPassedTests;
    private final Integer boundaryTests;
    private final Integer boundaryPassedTests;
    private final Integer validationTests;
    private final Integer validationPassedTests;
    private final Integer authTests;
    private final Integer authPassedTests;

    public ProjectStatsDTO(List<ProjectExecution> totalExecutions){
        ProjectExecution latestTest = totalExecutions.get(0);
        this.totalEndpoints = latestTest.getTotalEndpoints();
        this.totalTests = latestTest.getTotalTests();
        this.testsPassed = latestTest.getTestsPassed();
        this.testsFailed = latestTest.getTestsFailed();
        this.testsError = latestTest.getTestsError();
        this.positiveTests = latestTest.getPositiveTests();
        this.positivePassedTests = latestTest.getPositivePassedTests();
        this.wrongTypeTests = latestTest.getWrongTypeTests();
        this.wrongTypePassedTests = latestTest.getWrongTypePassedTests();
        this.missingFieldsTests = latestTest.getMissingFieldsTests();
        this.missingFieldsPassedTests = latestTest.getMissingFieldsPassedTests();
        this.boundaryTests = latestTest.getBoundaryTests();
        this.boundaryPassedTests = latestTest.getBoundaryPassedTests();
        this.validationTests = latestTest.getValidationTests();
        this.validationPassedTests = latestTest.getValidationPassedTests();
        this.authTests = latestTest.getAuthTests();
        this.authPassedTests = latestTest.getAuthPassedTests();
        for(ProjectExecution exec: totalExecutions){
            this.avgSuccessRate += exec.getSuccessRate();
            this.avgDurationMs += exec.getTotalDurationMs();
        }
        this.avgDurationMs /= (long) totalExecutions.size();
        this.avgSuccessRate /= (double) totalExecutions.size();
    }

    public Map<String, String> toMap(){
        Map<String, String> map = new LinkedHashMap<>();
        map.put("totalEndpoints", this.totalEndpoints.toString());
        map.put("totalTests", this.totalTests.toString());
        map.put("testsPassed", this.testsPassed.toString());
        map.put("testsFailed", this.testsFailed.toString());
        map.put("testsError", this.testsError.toString());
        map.put("avgSuccessRate", this.avgSuccessRate + "%");
        map.put("avgDurationMs", this.avgDurationMs + " Ms");
        map.put("positiveTests", this.positivePassedTests + " Passed Out Of " + this.positiveTests);
        map.put("validationTests", this.validationPassedTests + " Passed Out Of " + this.validationTests);
        map.put("boundaryTests", this.boundaryPassedTests + " Passed Out Of " + this.boundaryTests);
        map.put("missingFieldsTests", this.missingFieldsPassedTests + " Passed Out Of " + this.missingFieldsTests);
        map.put("wrongTypeTests", this.wrongTypePassedTests + " Passed Out Of " + this.wrongTypeTests);
        map.put("authTests", this.authPassedTests + " Passed Out Of " + this.authTests);
        return map;
    }
}
