package org.example.executionservice.controller;

import org.example.executionservice.dto.*;
import org.example.executionservice.entity.ProjectExecution;
import org.example.executionservice.entity.TestExecution;
import org.example.executionservice.repository.ProjectExecutionRepository;
import org.example.executionservice.repository.TestExecutionRepository;
import org.example.executionservice.service.ProjectExecutionService;
import org.example.executionservice.service.SingleReportService;
import org.example.executionservice.service.TestExecutionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/executions")
@RequiredArgsConstructor
@Slf4j
public class ExecutionController {

    private final TestExecutionService testExecutionService;
    private final ProjectExecutionService projectExecutionService;
    private final TestExecutionRepository testExecutionRepository;
    private final ProjectExecutionRepository projectExecutionRepository;
    private final SingleReportService singleReportService;

    // ==========================================
    // EXÉCUTION D'UN SEUL TEST
    // ==========================================

    /**
     * Exécuter UN SEUL test (1 endpoint + 1 type de test)
     * POST /api/executions/execute
     */
    @PostMapping("/execute")
    public ResponseEntity<ExecuteTestResponse> executeTest(@RequestBody ExecuteTestRequest request) {
        log.info("📌 Exécution d'un test: projectId={}, endpointId={}, type={}",
                request.getProjectId(), request.getEndpointId(), request.getTestType());
        ExecuteTestResponse response = testExecutionService.executeTest(request);
        return ResponseEntity.ok(response);
    }

    // ==========================================
    // EXÉCUTION D'UN PROJET COMPLET
    // ==========================================

    /**
     * Lancer l'exécution de TOUS les tests d'un projet (asynchrone)
     * POST /api/executions/execute-project
     */
    @PostMapping("/execute-project")
    public ResponseEntity<StartExecutionResponse> startProjectExecution(
            @RequestBody ExecuteProjectRequest request
    ) {
        log.info("🚀 Démarrage exécution projet: projectId={}", request.getProjectId());
        StartExecutionResponse response = projectExecutionService.startExecution(request);
        return ResponseEntity.ok(response);
    }

    // ==========================================
    // RÉCUPÉRATION HISTORIQUE PROJET
    // ==========================================

    /**
     * ⭐ Récupérer TOUTES les exécutions (ProjectExecution) d'un projet
     * Ordonné par date décroissante (plus récent en premier)
     * GET /api/executions/project/{projectId}
     */
    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<ProjectExecution>> getProjectExecutions(@PathVariable UUID projectId) {
        log.info("📋 Récupération historique projet: {}", projectId);
        List<ProjectExecution> executions = projectExecutionRepository
                .findByProjectIdOrderByExecutedAtDesc(projectId);
        log.info("✅ {} exécutions trouvées", executions.size());
        return ResponseEntity.ok(executions);
    }

    /**
     * Récupérer les logs d'une exécution de projet
     * GET /api/executions/{executionId}/logs
     */
    @GetMapping("/{executionId}/logs")
    public ResponseEntity<List<String>> getExecutionLogs(@PathVariable UUID executionId) {
        log.info("📜 Récupération logs exécution: {}", executionId);
        List<String> logs = projectExecutionService.getExecutionLogs(executionId);
        return ResponseEntity.ok(logs);
    }

    /**
     * Récupérer le statut d'une exécution de projet
     * GET /api/executions/{executionId}/status
     */
    @GetMapping("/{executionId}/status")
    public ResponseEntity<ProjectExecutionResponse> getExecutionStatus(@PathVariable UUID executionId) {
        log.info("📊 Récupération statut exécution: {}", executionId);
        ProjectExecutionResponse response = projectExecutionService.getExecutionStatus(executionId);
        return ResponseEntity.ok(response);
    }

    /**
     * ⭐ Récupérer TOUS les TestExecution d'une ProjectExecution
     * GET /api/executions/{executionId}/test-executions
     */
    @GetMapping("/{executionId}/test-executions")
    public ResponseEntity<List<TestExecution>> getTestExecutionsByExecutionId(
            @PathVariable UUID executionId
    ) {
        log.info("🔍 Récupération tests de l'exécution: {}", executionId);
        List<TestExecution> testExecutions = testExecutionRepository
                .findByExecutionIdOrderByExecutedAtDesc(executionId);
        log.info("✅ {} tests trouvés", testExecutions.size());
        return ResponseEntity.ok(testExecutions);
    }

    /**
     * Récupérer UNE ProjectExecution par son ID
     * GET /api/executions/{executionId}
     */
    @GetMapping("/{executionId}")
    public ResponseEntity<ProjectExecution> getProjectExecutionById(@PathVariable UUID executionId) {
        log.info("🔎 Récupération exécution: {}", executionId);
        ProjectExecution execution = projectExecutionRepository.findById(executionId)
                .orElseThrow(() -> new RuntimeException("ProjectExecution not found: " + executionId));
        return ResponseEntity.ok(execution);
    }

    // ==========================================
    // RÉCUPÉRATION PAR ENDPOINT
    // ==========================================

    /**
     * Récupérer tous les TestExecution d'un endpoint
     * GET /api/executions/endpoint/{endpointId}
     */
    @GetMapping("/endpoint/{endpointId}")
    public ResponseEntity<List<TestExecution>> getTestExecutionsByEndpoint(
            @PathVariable UUID endpointId
    ) {
        log.info("📍 Récupération tests de l'endpoint: {}", endpointId);
        List<TestExecution> executions = testExecutionRepository.findByEndpointId(endpointId);
        return ResponseEntity.ok(executions);
    }

    /**
     * Récupérer UN TestExecution par son ID
     * GET /api/executions/test/{testExecutionId}
     */
    @GetMapping("/test/{testExecutionId}")
    public ResponseEntity<TestExecution> getTestExecutionById(@PathVariable UUID testExecutionId) {
        log.info("🔎 Récupération test exécution: {}", testExecutionId);
        TestExecution execution = testExecutionRepository.findById(testExecutionId)
                .orElseThrow(() -> new RuntimeException("TestExecution not found: " + testExecutionId));
        return ResponseEntity.ok(execution);
    }

    /**
     * ⭐ Supprimer toutes les exécutions d'un projet
     * DELETE /api/executions/project/{projectId}
     */
    @DeleteMapping("/project/{projectId}")
    public ResponseEntity<Map<String, String>> deleteExecutionsByProjectId(
            @PathVariable UUID projectId
    ) {
        log.info("🗑️ Suppression des exécutions du projet {}", projectId);
        try {
            String message = projectExecutionService.deleteExecutionsByProjectId(projectId);
            return ResponseEntity.ok(Map.of(
                    "success", "true",
                    "message", message
            ));
        } catch (Exception e) {
            log.error("❌ Erreur suppression : {}", e.getMessage());
            return ResponseEntity.ok(Map.of(
                    "success", "false",
                    "message", e.getMessage()
            ));
        }
    }

    @GetMapping("/report/{projectId}/{endpointId}")
    public ResponseEntity<?> generateSingleEndpointReport(@PathVariable UUID projectId, @PathVariable UUID endpointId){
        try{
            byte[] pdf = singleReportService.reportSingleEndpoint(projectId, endpointId);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDisposition(
                    ContentDisposition.attachment().filename("Endpoint-report.pdf").build()
            );
            return ResponseEntity.ok().headers(headers).body(pdf);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

}