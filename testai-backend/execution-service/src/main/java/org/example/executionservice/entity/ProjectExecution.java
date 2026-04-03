package org.example.executionservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "project_executions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectExecution {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID projectId;

    private String projectName;

    @Column(nullable = false)
    private Integer totalEndpoints;

    @Column(nullable = false)
    private Integer totalTests;

    @Column(nullable = false)
    private Integer testsPassed;

    @Column(nullable = false)
    private Integer testsFailed;

    @Column(nullable = false)
    private Integer testsError;

    @Column(nullable = false)
    private Double successRate;

    @Column(nullable = false)
    private Long totalDurationMs;

    // Statistiques par type
    private Integer positiveTests;
    private Integer positivePassedTests;
    private Integer wrongTypeTests;
    private Integer wrongTypePassedTests;
    private Integer missingFieldsTests;
    private Integer missingFieldsPassedTests;
    private Integer boundaryTests;
    private Integer boundaryPassedTests;
    private Integer validationTests;
    private Integer validationPassedTests;
    private Integer authTests;
    private Integer authPassedTests;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ExecutionStatus status;

    @Column(nullable = false)
    private UUID executedBy;

    @CreationTimestamp
    @Column(nullable = false)
    private Instant executedAt;

    private Instant completedAt;

    private String executionContext;

    public enum ExecutionStatus {
        RUNNING, COMPLETED, FAILED
    }
}