// org.example.executionservice.dto.ProjectExecutionResponse
package org.example.executionservice.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class ProjectExecutionResponse {
    private UUID executionId;
    private UUID projectId;
    private String projectName;
    private Integer totalEndpoints;
    private Integer totalTests;
    private Integer testsPassed;
    private Integer testsFailed;
    private Integer testsError;
    private Double successRate;
    private Long totalDurationMs;
    private Map<String, TestTypeStats> statsByType;
    private List<EndpointSummary> failedEndpoints;
    private String status;
    private Instant executedAt;
    private Instant completedAt;

    @Data
    @Builder
    public static class TestTypeStats {
        private Integer total;
        private Integer passed;
        private Integer failed;
        private Double passRate;
    }

    @Data
    @Builder
    public static class EndpointSummary {
        private UUID endpointId;
        private String method;
        private String path;
        private Integer totalTests;
        private Integer passed;
        private Integer failed;
        private Double passRate;
    }
}