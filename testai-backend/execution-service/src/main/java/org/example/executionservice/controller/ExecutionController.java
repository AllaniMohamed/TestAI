package org.example.executionservice.controller;

import org.example.executionservice.dto.*;
import org.example.executionservice.entity.TestExecution;
import org.example.executionservice.repository.TestExecutionRepository;
import org.example.executionservice.service.ProjectExecutionService;
import org.example.executionservice.service.TestExecutionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/executions")
@RequiredArgsConstructor
public class ExecutionController {

    private final TestExecutionService executionService;
    private final TestExecutionRepository executionRepository;
    private final ProjectExecutionService projectExecutionService;



    /**
     * Exécuter un test spécifique (un endpoint + une catégorie)
     */
    @PostMapping("/execute")
    public ResponseEntity<ExecuteTestResponse> executeTest(@RequestBody ExecuteTestRequest request) {
        ExecuteTestResponse response = executionService.executeTest(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Récupérer toutes les exécutions d’un projet
     */
    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<TestExecution>> getExecutionsByProject(@PathVariable UUID projectId) {
        List<TestExecution> executions = executionRepository.findByProjectId(projectId);
        return ResponseEntity.ok(executions);
    }

    /**
     * Récupérer toutes les exécutions d’un endpoint
     */
    @GetMapping("/endpoint/{endpointId}")
    public ResponseEntity<List<TestExecution>> getExecutionsByEndpoint(@PathVariable UUID endpointId) {
        List<TestExecution> executions = executionRepository.findByEndpointId(endpointId);
        return ResponseEntity.ok(executions);
    }

    /**
     * Récupérer une exécution par son ID
     */
    @GetMapping("/{executionId}")
    public ResponseEntity<TestExecution> getExecutionById(@PathVariable UUID executionId) {
        TestExecution execution = executionRepository.findById(executionId)
                .orElseThrow(() -> new RuntimeException("Execution not found"));
        return ResponseEntity.ok(execution);
    }
    @PostMapping("/execute-project")
    public ResponseEntity<StartExecutionResponse> startExecution(@RequestBody ExecuteProjectRequest request) {
        return ResponseEntity.ok(projectExecutionService.startExecution(request));
    }

    @GetMapping("/{executionId}/logs")
    public ResponseEntity<List<String>> getExecutionLogs(@PathVariable UUID executionId) {
        return ResponseEntity.ok(projectExecutionService.getExecutionLogs(executionId));
    }

    @GetMapping("/{executionId}/status")
    public ResponseEntity<ProjectExecutionResponse> getExecutionStatus(@PathVariable UUID executionId) {
        return ResponseEntity.ok(projectExecutionService.getExecutionStatus(executionId));
    }
    @GetMapping("/{executionId}/test-executions")
    public ResponseEntity<List<TestExecution>> getTestExecutionsByExecutionId(@PathVariable UUID executionId) {
        List<TestExecution> executions = executionRepository.findByExecutionId(executionId);
        return ResponseEntity.ok(executions);
    }
}