package org.example.executionservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.executionservice.dto.*;
import org.example.executionservice.entity.*;
import org.example.executionservice.entity.ProjectExecution.ExecutionStatus;
import org.example.executionservice.entity.TestExecution.TestStatus;
import org.example.executionservice.entity.TestExecution.TestType;
import org.example.executionservice.feignclient.*;
import org.example.executionservice.repository.ProjectExecutionRepository;
import org.example.executionservice.repository.TestExecutionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class ProjectExecutionService {

    private final ProjectExecutionRepository projectExecutionRepository;
    private final TestExecutionRepository testExecutionRepository;
    private final ProjectServiceClient projectServiceClient;
    private final EndpointServiceClient endpointServiceClient;
    private final TestServiceClient testServiceClient;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    private final Map<UUID, List<String>> executionLogs = new ConcurrentHashMap<>();

    // ==========================================
    // MÉTHODES PUBLIQUES (asynchrones)
    // ==========================================

    /**
     * Lance l'exécution asynchrone des tests d'un projet.
     * Crée d'abord l'enregistrement ProjectExecution en base,
     * puis lance la tâche asynchrone.
     */
    public StartExecutionResponse startExecution(ExecuteProjectRequest request) {
        // 1. Récupérer les informations de base (nom du projet, etc.) pour créer l'entité
        ProjectDTO project = projectServiceClient.getProjectById(request.getProjectId());
        List<EndpointDTO> endpoints = endpointServiceClient.getEndpointsByProjectId(request.getProjectId());

        // 2. Créer l'entité ProjectExecution (statut RUNNING)
        ProjectExecution execution = ProjectExecution.builder()
                .projectId(request.getProjectId())
                .projectName(project.getName())
                .totalEndpoints(endpoints.size())
                .status(ExecutionStatus.RUNNING)
                .executedBy(request.getExecutedBy())
                .executionContext(request.getExecutionContext() != null ? request.getExecutionContext() : "manual")
                .totalTests(0)
                .testsPassed(0)
                .testsFailed(0)
                .testsError(0)
                .successRate(0.0)
                .totalDurationMs(0L)
                .build();
        execution = projectExecutionRepository.save(execution);
        UUID executionId = execution.getId();

        // 3. Initialiser les logs
        executionLogs.put(executionId, new ArrayList<>());
        addLog(executionId, "🚀 Démarrage de l'exécution du projet " + project.getName());

        // 4. Lancer l'exécution asynchrone (en lui passant l'ID et les données déjà récupérées)
        executeAllProjectTestsAsync(request, executionId, project, endpoints);

        return new StartExecutionResponse(executionId);
    }

    /**
     * Récupère les logs d'une exécution.
     */
    public List<String> getExecutionLogs(UUID executionId) {
        return executionLogs.getOrDefault(executionId, List.of());
    }

    /**
     * Récupère le statut final d'une exécution (depuis la base).
     */
    public ProjectExecutionResponse getExecutionStatus(UUID executionId) {
        ProjectExecution execution = projectExecutionRepository.findById(executionId)
                .orElseThrow(() -> new RuntimeException("Exécution non trouvée"));
        return buildProjectExecutionResponse(execution, new HashMap<>(), new HashMap<>());
    }

    // ==========================================
    // LOGS INTERNES
    // ==========================================

    private void addLog(UUID executionId, String message) {
        executionLogs.computeIfAbsent(executionId, k -> new ArrayList<>()).add(message);
        log.info("[{}] {}", executionId, message);
    }

    // ==========================================
    // EXÉCUTION ASYNCHRONE (cœur)
    // ==========================================

    @Async
    public CompletableFuture<Void> executeAllProjectTestsAsync(
            ExecuteProjectRequest request,
            UUID executionId,
            ProjectDTO project,
            List<EndpointDTO> endpoints
    ) {
        Instant startTime = Instant.now();
        int totalTests = 0;
        int testsPassed = 0;
        int testsFailed = 0;
        int testsError = 0;
        Map<String, Integer> testsCountByType = new HashMap<>();
        Map<String, Integer> testsPassedByType = new HashMap<>();

        try {
            addLog(executionId, "✅ Projet récupéré: " + project.getName());
            addLog(executionId, "✅ " + endpoints.size() + " endpoints récupérés");

            if (endpoints.isEmpty()) {
                throw new RuntimeException("Aucun endpoint trouvé pour ce projet");
            }

            for (EndpointDTO endpoint : endpoints) {
                addLog(executionId, "📍 Exécution endpoint: " + endpoint.getMethod() + " " + endpoint.getPath());

                try {
                    TestDTO tests = testServiceClient.getTestsByProjectIdAndEndpointId(
                            request.getProjectId(), endpoint.getId());

                    if (tests == null) {
                        addLog(executionId, "⚠️ Aucun test trouvé pour cet endpoint");
                        continue;
                    }

                    Map<String, Map<String, Object>> allTests = new HashMap<>();
                    if (tests.getPositive() != null) allTests.put("POSITIVE", tests.getPositive());
                    if (tests.getWrongType() != null) allTests.put("WRONG_TYPE", tests.getWrongType());
                    if (tests.getMissingFields() != null) allTests.put("MISSING_FIELDS", tests.getMissingFields());
                    if (tests.getBoundary() != null) allTests.put("BOUNDARY", tests.getBoundary());
                    if (tests.getValidation() != null) allTests.put("VALIDATION", tests.getValidation());
                    if (tests.getAuth() != null) allTests.put("AUTH", tests.getAuth());

                    for (Map.Entry<String, Map<String, Object>> entry : allTests.entrySet()) {
                        String testType = entry.getKey();
                        Map<String, Object> testData = entry.getValue();
                        if (testData == null || testData.isEmpty()) continue;

                        totalTests++;
                        testsCountByType.put(testType, testsCountByType.getOrDefault(testType, 0) + 1);

                        try {
                            TestExecution execution = executeSingleTest(
                                    project, endpoint, testData, testType,
                                    request.getExecutedBy(), request.getExecutionContext(), executionId
                            );
                            execution = testExecutionRepository.save(execution); // ⭐ persister

                            if (execution.getStatus() == TestStatus.SUCCESS) {
                                testsPassed++;
                                testsPassedByType.put(testType, testsPassedByType.getOrDefault(testType, 0) + 1);
                                addLog(executionId, "   ✅ " + testType + " : SUCCESS");
                            } else if (execution.getStatus() == TestStatus.FAILED) {
                                testsFailed++;
                                addLog(executionId, "   ❌ " + testType + " : FAILED (expected " +
                                        execution.getExpectedStatusCode() + ", got " + execution.getResponseStatusCode() + ")");
                            } else {
                                testsError++;
                                addLog(executionId, "   ⚠️ " + testType + " : ERROR - " + execution.getErrorMessage());
                            }
                        } catch (Exception e) {
                            testsError++;
                            addLog(executionId, "   ❌ " + testType + " : EXCEPTION - " + e.getMessage());
                        }
                    }
                } catch (Exception e) {
                    addLog(executionId, "❌ Erreur endpoint : " + e.getMessage());
                }
            }

            Instant endTime = Instant.now();
            long totalDurationMs = endTime.toEpochMilli() - startTime.toEpochMilli();
            double successRate = totalTests > 0 ? (testsPassed * 100.0 / totalTests) : 0.0;

            // Mettre à jour l'enregistrement ProjectExecution existant
            ProjectExecution execution = projectExecutionRepository.findById(executionId).orElseThrow();
            execution.setTotalTests(totalTests);
            execution.setTestsPassed(testsPassed);
            execution.setTestsFailed(testsFailed);
            execution.setTestsError(testsError);
            execution.setSuccessRate(successRate);
            execution.setTotalDurationMs(totalDurationMs);
            execution.setStatus(ExecutionStatus.COMPLETED);
            execution.setCompletedAt(endTime);

            execution.setPositiveTests(testsCountByType.getOrDefault("POSITIVE", 0));
            execution.setPositivePassedTests(testsPassedByType.getOrDefault("POSITIVE", 0));
            execution.setWrongTypeTests(testsCountByType.getOrDefault("WRONG_TYPE", 0));
            execution.setWrongTypePassedTests(testsPassedByType.getOrDefault("WRONG_TYPE", 0));
            execution.setMissingFieldsTests(testsCountByType.getOrDefault("MISSING_FIELDS", 0));
            execution.setMissingFieldsPassedTests(testsPassedByType.getOrDefault("MISSING_FIELDS", 0));
            execution.setBoundaryTests(testsCountByType.getOrDefault("BOUNDARY", 0));
            execution.setBoundaryPassedTests(testsPassedByType.getOrDefault("BOUNDARY", 0));
            execution.setValidationTests(testsCountByType.getOrDefault("VALIDATION", 0));
            execution.setValidationPassedTests(testsPassedByType.getOrDefault("VALIDATION", 0));
            execution.setAuthTests(testsCountByType.getOrDefault("AUTH", 0));
            execution.setAuthPassedTests(testsPassedByType.getOrDefault("AUTH", 0));

            projectExecutionRepository.save(execution);

            addLog(executionId, "✅ EXÉCUTION TERMINÉE : " + testsPassed + "/" + totalTests + " tests réussis (" +
                    String.format("%.1f", successRate) + "%)");
            addLog(executionId, "📊 Durée totale : " + totalDurationMs + " ms");

        } catch (Exception e) {
            log.error("Erreur globale exécution projet: {}", e.getMessage(), e);
            addLog(executionId, "❌ ERREUR GLOBALE : " + e.getMessage());
            try {
                ProjectExecution execution = projectExecutionRepository.findById(executionId).orElse(null);
                if (execution != null) {
                    execution.setStatus(ExecutionStatus.FAILED);
                    execution.setCompletedAt(Instant.now());
                    projectExecutionRepository.save(execution);
                }
            } catch (Exception ex) {
                log.error("Impossible de mettre à jour le statut d'échec", ex);
            }
        }
        return CompletableFuture.completedFuture(null);
    }

    // ==========================================
    // MÉTHODES PRIVÉES (inchangées, mais recopiées pour complétude)
    // ==========================================

    private TestExecution executeSingleTest(ProjectDTO project, EndpointDTO endpoint,
                                            Map<String, Object> testData, String testType,
                                            UUID executedBy, String executionContext,UUID executionId) {
        try {
            Map<String, Object> responseObj = (Map<String, Object>) testData.get("response");
            if (responseObj == null) throw new RuntimeException("Missing 'response' field");

            String fullPath = endpoint.getPath();
            Map<String, Object> pathParams = (Map<String, Object>) responseObj.getOrDefault("pathParams", Map.of());
            for (Map.Entry<String, Object> entry : pathParams.entrySet()) {
                fullPath = fullPath.replace("{" + entry.getKey() + "}", entry.getValue().toString());
            }

            String queryString = "";
            Map<String, Object> queryParams = (Map<String, Object>) responseObj.getOrDefault("queryParams", Map.of());
            if (!queryParams.isEmpty()) {
                queryString = "?" + queryParams.entrySet().stream()
                        .map(e -> e.getKey() + "=" + e.getValue())
                        .collect(Collectors.joining("&"));
            }
            String fullUrl = project.getProjectUrl() + fullPath + queryString;

            HttpHeaders headers = buildHeaders(project, endpoint);
            Map<String, String> testHeaders = (Map<String, String>) responseObj.getOrDefault("headers", Map.of());
            testHeaders.forEach(headers::set);

            HttpEntity<?> entity;
            String method = endpoint.getMethod();
            if ("GET".equalsIgnoreCase(method) || "DELETE".equalsIgnoreCase(method)) {
                entity = new HttpEntity<>(headers);
            } else {
                Object payload = responseObj.get("payload");
                entity = new HttpEntity<>(payload, headers);
            }

            long execStart = System.currentTimeMillis();
            ResponseEntity<Map> response;
            try {
                response = restTemplate.exchange(fullUrl, HttpMethod.valueOf(method.toUpperCase()), entity, Map.class);
            } catch (HttpClientErrorException | HttpServerErrorException ex) {
                response = new ResponseEntity<>(parseErrorBody(ex.getResponseBodyAsString()), ex.getResponseHeaders(), ex.getStatusCode());
            }
            long responseTimeMs = System.currentTimeMillis() - execStart;

            Integer expectedStatus = (Integer) responseObj.get("expectedStatus");
            Integer actualStatus = response.getStatusCode().value();
            boolean statusMatch = expectedStatus != null && expectedStatus.equals(actualStatus);

            return TestExecution.builder()
                    .projectId(project.getId())
                    .endpointId(endpoint.getId())
                    .endpointPath(endpoint.getPath())
                    .httpMethod(endpoint.getMethod())
                    .testType(TestType.valueOf(testType))
                    .requestUrl(fullUrl)
                    .requestHeaders(extractHeaders(headers))
                    .requestBody(entity.getBody() instanceof Map ? (Map<String, Object>) entity.getBody() : null)
                    .responseStatusCode(actualStatus)
                    .responseHeaders(extractHeaders(response.getHeaders()))
                    .responseBody(response.getBody())
                    .responseTimeMs(responseTimeMs)
                    .expectedStatusCode(expectedStatus)
                    .statusCodeMatch(statusMatch)
                    .schemaValidationPassed(true)
                    .status(statusMatch ? TestStatus.SUCCESS : TestStatus.FAILED)
                    .errorMessage(statusMatch ? null : "Expected " + expectedStatus + " but got " + actualStatus)
                    .executedBy(executedBy)
                    .executionContext(executionContext != null ? executionContext : "manual")
                    .executionId(executionId)
                    .build();
        } catch (Exception e) {
            return TestExecution.builder()
                    .projectId(project.getId())
                    .endpointId(endpoint.getId())
                    .endpointPath(endpoint.getPath())
                    .httpMethod(endpoint.getMethod())
                    .testType(TestType.valueOf(testType))
                    .status(TestStatus.ERROR)
                    .errorMessage(e.getMessage())
                    .executedBy(executedBy)
                    .executionContext(executionContext != null ? executionContext : "manual")
                    .build();
        }
    }

    private HttpHeaders buildHeaders(ProjectDTO project, EndpointDTO endpoint) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (Boolean.TRUE.equals(endpoint.getRequiresAuth()) && project.getCredentials() != null) {
            ApiCredentialsDTO creds = project.getCredentials();
            switch (project.getAuthType()) {
                case "BASIC":
                    String auth = creds.getBasicUsername() + ":" + creds.getBasicPassword();
                    String encoded = Base64.getEncoder().encodeToString(auth.getBytes());
                    headers.set("Authorization", "Basic " + encoded);
                    break;
                case "APIKEY":
                    if ("HEADER".equals(creds.getApiKeyLocation()))
                        headers.set(creds.getApiKeyHeader(), creds.getApiKey());
                    break;
                case "BEARER":
                    headers.set("Authorization", "Bearer " + creds.getBearerToken());
                    break;
            }
        }
        return headers;
    }

    private Map<String, String> extractHeaders(HttpHeaders headers) {
        if (headers == null) return Map.of();
        Map<String, String> map = new HashMap<>();
        headers.forEach((key, values) -> map.put(key, String.join(",", values)));
        return map;
    }

    private Map<String, Object> parseErrorBody(String body) {
        try {
            return objectMapper.readValue(body, Map.class);
        } catch (Exception e) {
            return Map.of("raw", body);
        }
    }

    private ProjectExecutionResponse buildProjectExecutionResponse(
            ProjectExecution execution,
            Map<String, Integer> testsCountByType,
            Map<String, Integer> testsPassedByType
    ) {
        Map<String, ProjectExecutionResponse.TestTypeStats> statsByType = new HashMap<>();
        for (String type : List.of("POSITIVE", "WRONG_TYPE", "MISSING_FIELDS", "BOUNDARY", "VALIDATION", "AUTH")) {
            int total = testsCountByType.getOrDefault(type, 0);
            int passed = testsPassedByType.getOrDefault(type, 0);
            double passRate = total > 0 ? (passed * 100.0 / total) : 0.0;
            statsByType.put(type, ProjectExecutionResponse.TestTypeStats.builder()
                    .total(total)
                    .passed(passed)
                    .failed(total - passed)
                    .passRate(passRate)
                    .build());
        }

        List<ProjectExecutionResponse.EndpointSummary> failedEndpoints = getFailedEndpointsSummary(execution.getProjectId());

        return ProjectExecutionResponse.builder()
                .executionId(execution.getId())
                .projectId(execution.getProjectId())
                .projectName(execution.getProjectName())
                .totalEndpoints(execution.getTotalEndpoints())
                .totalTests(execution.getTotalTests())
                .testsPassed(execution.getTestsPassed())
                .testsFailed(execution.getTestsFailed())
                .testsError(execution.getTestsError())
                .successRate(execution.getSuccessRate())
                .totalDurationMs(execution.getTotalDurationMs())
                .statsByType(statsByType)
                .failedEndpoints(failedEndpoints)
                .status(execution.getStatus().name())
                .executedAt(execution.getExecutedAt())
                .completedAt(execution.getCompletedAt())
                .build();
    }

    private List<ProjectExecutionResponse.EndpointSummary> getFailedEndpointsSummary(UUID projectId) {
        List<TestExecution> executions = testExecutionRepository.findByProjectId(projectId);
        Map<UUID, List<TestExecution>> grouped = executions.stream()
                .collect(Collectors.groupingBy(TestExecution::getEndpointId));
        return grouped.entrySet().stream()
                .map(entry -> {
                    UUID endpointId = entry.getKey();
                    List<TestExecution> tests = entry.getValue();
                    int total = tests.size();
                    int passed = (int) tests.stream().filter(t -> t.getStatus() == TestStatus.SUCCESS).count();
                    int failed = total - passed;
                    double passRate = total > 0 ? (passed * 100.0 / total) : 0.0;
                    TestExecution first = tests.get(0);
                    return ProjectExecutionResponse.EndpointSummary.builder()
                            .endpointId(endpointId)
                            .method(first.getHttpMethod())
                            .path(first.getEndpointPath())
                            .totalTests(total)
                            .passed(passed)
                            .failed(failed)
                            .passRate(passRate)
                            .build();
                })
                .filter(s -> s.getFailed() > 0)
                .sorted((a, b) -> Integer.compare(b.getFailed(), a.getFailed()))
                .limit(10)
                .collect(Collectors.toList());
    }
}