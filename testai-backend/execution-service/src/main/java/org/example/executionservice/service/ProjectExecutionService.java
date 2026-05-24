package org.example.executionservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
import org.example.executionservice.config.FeignTokenContext;
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
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

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
    private final NotificationServiceClient notificationServiceClient;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    private final Map<UUID, List<String>> executionLogs = new ConcurrentHashMap<>();
    // ⭐ Map pour stocker temporairement les tokens d'authentification par exécution
    private final Map<UUID, String> executionTokens = new ConcurrentHashMap<>();

    // ── Helper notification ────────────────────────────────────────────────
    private void sendNotificationSafe(NotificationServiceClient.NotificationRequest request) {
        try {
            notificationServiceClient.sendNotification(request);
        } catch (Exception e) {
            log.warn("⚠️ Notification non envoyée: {}", e.getMessage());
        }
    }

    public StartExecutionResponse startExecution(ExecuteProjectRequest request) {

        // ⭐ Capturer le token depuis la requête HTTP entrante
        String authToken = null;
        ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            authToken = attrs.getRequest().getHeader("Authorization");
        }

        ProjectDTO project   = projectServiceClient.getProjectById(request.getProjectId());
        List<EndpointDTO> endpoints = endpointServiceClient.getEndpointsByProjectId(request.getProjectId());

        ProjectExecution execution = ProjectExecution.builder()
                .projectId(request.getProjectId())
                .projectName(project.getName())
                .totalEndpoints(endpoints.size())
                .status(ExecutionStatus.RUNNING)
                .executedBy(request.getExecutedBy())
                .executionContext(request.getExecutionContext() != null
                        ? request.getExecutionContext() : "manual")
                .totalTests(0).testsPassed(0).testsFailed(0).testsError(0)
                .successRate(0.0).totalDurationMs(0L)
                .build();

        execution = projectExecutionRepository.save(execution);
        UUID executionId = execution.getId();

        executionLogs.put(executionId, new ArrayList<>());
        addLog(executionId, "🚀 Démarrage de l'exécution du projet " + project.getName());

        // ⭐ Stocker le token pour le thread async
        if (authToken != null) {
            executionTokens.put(executionId, authToken);
        }

        executeAllProjectTestsAsync(request, executionId, project, endpoints, authToken);

        return new StartExecutionResponse(executionId);
    }

    public List<String> getExecutionLogs(UUID executionId) {
        return executionLogs.getOrDefault(executionId, List.of());
    }

    public ProjectExecutionResponse getExecutionStatus(UUID executionId) {
        ProjectExecution execution = projectExecutionRepository.findById(executionId)
                .orElseThrow(() -> new RuntimeException("Exécution non trouvée"));
        return buildProjectExecutionResponse(execution, new HashMap<>(), new HashMap<>());
    }

    private void addLog(UUID executionId, String message) {
        executionLogs.computeIfAbsent(executionId, k -> new ArrayList<>()).add(message);
        log.info("[{}] {}", executionId, message);
    }


    @Async
    public CompletableFuture<Void> executeAllProjectTestsAsync(
            ExecuteProjectRequest request,
            UUID executionId,
            ProjectDTO project,
            List<EndpointDTO> endpoints,
            String authToken                  // ⭐ token passé en paramètre
    ) {
        // ⭐ Injecter le token dans le ThreadLocal de CE thread async
        if (authToken != null) {
            FeignTokenContext.set(authToken);
        }

        Instant startTime = Instant.now();
        int totalTests = 0, testsPassed = 0, testsFailed = 0, testsError = 0;
        Map<String, Integer> testsCountByType  = new HashMap<>();
        Map<String, Integer> testsPassedByType = new HashMap<>();

        try {
            addLog(executionId, "✅ Projet récupéré : " + project.getName());
            addLog(executionId, "✅ " + endpoints.size() + " endpoints récupérés");

            if (endpoints.isEmpty()) {
                throw new RuntimeException("Aucun endpoint trouvé pour ce projet");
            }

            for (EndpointDTO endpoint : endpoints) {
                addLog(executionId, "📍 Exécution endpoint : "
                        + endpoint.getMethod() + " " + endpoint.getPath());
                try {
                    TestDTO tests = testServiceClient.getTestsByProjectIdAndEndpointId(
                            request.getProjectId(), endpoint.getId());

                    if (tests == null) {
                        addLog(executionId, "⚠️ Aucun test trouvé pour cet endpoint");
                        continue;
                    }

                    // Construire la map des tests disponibles
                    Map<String, Map<String, Object>> allTests = new LinkedHashMap<>();
                    if (tests.getPositive()      != null) allTests.put("POSITIVE",       tests.getPositive());
                    if (tests.getWrongType()     != null) allTests.put("WRONG_TYPE",     tests.getWrongType());
                    if (tests.getMissingFields() != null) allTests.put("MISSING_FIELDS", tests.getMissingFields());
                    if (tests.getBoundary()      != null) allTests.put("BOUNDARY",       tests.getBoundary());
                    if (tests.getValidation()    != null) allTests.put("VALIDATION",     tests.getValidation());
                    if (tests.getAuth()          != null) allTests.put("AUTH",           tests.getAuth());

                    for (Map.Entry<String, Map<String, Object>> entry : allTests.entrySet()) {
                        String testType             = entry.getKey();
                        Map<String, Object> testData = entry.getValue();

                        if (testData == null || testData.isEmpty()) continue;

                        totalTests++;
                        testsCountByType.merge(testType, 1, Integer::sum);

                        try {
                            TestExecution exec = executeSingleTest(
                                    project, endpoint, testData, testType,
                                    request.getExecutedBy(),
                                    request.getExecutionContext(),
                                    executionId
                            );
                            exec = testExecutionRepository.save(exec);

                            switch (exec.getStatus()) {
                                case SUCCESS -> {
                                    testsPassed++;
                                    testsPassedByType.merge(testType, 1, Integer::sum);
                                    addLog(executionId, "   ✅ " + testType + " : SUCCESS");
                                }
                                case FAILED -> {
                                    testsFailed++;
                                    addLog(executionId, "   ❌ " + testType + " : FAILED"
                                            + " (expected " + exec.getExpectedStatusCode()
                                            + ", got " + exec.getResponseStatusCode() + ")");
                                }
                                default -> {
                                    testsError++;
                                    addLog(executionId, "   ⚠️ " + testType
                                            + " : ERROR — " + exec.getErrorMessage());
                                }
                            }
                        } catch (Exception e) {
                            testsError++;
                            addLog(executionId, "   ❌ " + testType
                                    + " : EXCEPTION — " + e.getMessage());
                        }
                    }

                } catch (Exception e) {
                    addLog(executionId, "❌ Erreur endpoint ["
                            + endpoint.getMethod() + " " + endpoint.getPath()
                            + "] : " + e.getMessage());
                }
            }

            // ── Finalisation ──────────────────────────────────────────────────
            Instant endTime        = Instant.now();
            long totalDurationMs   = endTime.toEpochMilli() - startTime.toEpochMilli();
            double successRate     = totalTests > 0 ? (testsPassed * 100.0 / totalTests) : 0.0;

            ProjectExecution execution = projectExecutionRepository
                    .findById(executionId).orElseThrow();

            execution.setTotalTests(totalTests);
            execution.setTestsPassed(testsPassed);
            execution.setTestsFailed(testsFailed);
            execution.setTestsError(testsError);
            execution.setSuccessRate(successRate);
            execution.setTotalDurationMs(totalDurationMs);
            execution.setStatus(ExecutionStatus.COMPLETED);
            execution.setCompletedAt(endTime);

            // Stats par type
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

            addLog(executionId, String.format(
                    "✅ TERMINÉ : %d/%d tests réussis (%.1f%%) en %dms",
                    testsPassed, totalTests, successRate, totalDurationMs));

            // ── Notification ──────────────────────────────────────────────────
            if (request.getExecutedBy() != null) {
                String context  = request.getExecutionContext();
                boolean isAuto  = "ci_cd".equals(context) || "scheduled".equals(context);

                sendNotificationSafe(new NotificationServiceClient.NotificationRequest(
                        request.getExecutedBy(),
                        isAuto ? "JENKINS_EXECUTION_DONE" : "MANUAL_EXECUTION_DONE",
                        isAuto ? "🤖 Jenkins — Exécution terminée" : "✅ Exécution terminée",
                        String.format("Projet \"%s\" : %d/%d tests réussis (%.1f%%)",
                                project.getName(), testsPassed, totalTests, successRate),
                        request.getProjectId(),
                        Map.of(
                                "successRate",      successRate,
                                "testsPassed",      testsPassed,
                                "testsFailed",      testsFailed,
                                "totalTests",       totalTests,
                                "totalDurationMs",  totalDurationMs,
                                "executionContext",  context != null ? context : "manual"
                        )
                ));
            }

        } catch (Exception e) {
            log.error("❌ Erreur globale exécution [{}] : {}", executionId, e.getMessage(), e);
            addLog(executionId, "❌ ERREUR GLOBALE : " + e.getMessage());

            try {
                ProjectExecution execution = projectExecutionRepository
                        .findById(executionId).orElse(null);
                if (execution != null) {
                    execution.setStatus(ExecutionStatus.FAILED);
                    execution.setCompletedAt(Instant.now());
                    projectExecutionRepository.save(execution);
                }
                if (request.getExecutedBy() != null) {
                    sendNotificationSafe(new NotificationServiceClient.NotificationRequest(
                            request.getExecutedBy(),
                            "MANUAL_EXECUTION_DONE",
                            "❌ Exécution échouée",
                            "Le projet \"" + project.getName() + "\" a rencontré une erreur fatale.",
                            request.getProjectId(),
                            Map.of("error", e.getMessage())
                    ));
                }
            } catch (Exception ex) {
                log.error("Impossible de mettre à jour le statut d'échec : {}", ex.getMessage());
            }

        } finally {
            // ⭐ Toujours nettoyer le ThreadLocal et la map des tokens
            FeignTokenContext.clear();
            executionTokens.remove(executionId);
        }

        return CompletableFuture.completedFuture(null);
    }


    // ── Méthodes privées inchangées ────────────────────────────────────────

    private TestExecution executeSingleTest(ProjectDTO project, EndpointDTO endpoint,
                                            Map<String, Object> testData, String testType,
                                            UUID executedBy, String executionContext, UUID executionId) {
        // ... (inchangé)
        try {
            Map<String, Object> responseObj = (Map<String, Object>) testData.get("response");
            if (responseObj == null) throw new RuntimeException("Missing 'response' field");

            String fullPath = endpoint.getPath();
            Map<String, Object> pathParams = (Map<String, Object>) responseObj.getOrDefault("pathParams", Map.of());
            for (Map.Entry<String, Object> entry : pathParams.entrySet())
                fullPath = fullPath.replace("{" + entry.getKey() + "}", entry.getValue().toString());

            String queryString = "";
            Map<String, Object> queryParams = (Map<String, Object>) responseObj.getOrDefault("queryParams", Map.of());
            if (!queryParams.isEmpty())
                queryString = "?" + queryParams.entrySet().stream()
                        .map(e -> e.getKey() + "=" + e.getValue())
                        .collect(Collectors.joining("&"));

            String fullUrl = project.getProjectUrl() + fullPath + queryString;
            HttpHeaders headers = buildHeaders(project, endpoint);
            Map<String, String> testHeaders = (Map<String, String>) responseObj.getOrDefault("headers", Map.of());
            testHeaders.forEach(headers::set);

            HttpEntity<?> entity;
            String method = endpoint.getMethod();
            if ("GET".equalsIgnoreCase(method) || "DELETE".equalsIgnoreCase(method))
                entity = new HttpEntity<>(headers);
            else
                entity = new HttpEntity<>(responseObj.get("payload"), headers);

            long execStart = System.currentTimeMillis();
            ResponseEntity<Map> response;
            try {
                response = restTemplate.exchange(fullUrl, HttpMethod.valueOf(method.toUpperCase()), entity, Map.class);
            } catch (HttpClientErrorException | HttpServerErrorException ex) {
                response = new ResponseEntity<>(parseErrorBody(ex.getResponseBodyAsString()),
                        ex.getResponseHeaders(), ex.getStatusCode());
            }
            long responseTimeMs = System.currentTimeMillis() - execStart;

            Integer expectedStatus = (Integer) responseObj.get("expectedStatus");
            Integer actualStatus   = response.getStatusCode().value();
            boolean statusMatch    = expectedStatus != null && expectedStatus.equals(actualStatus);

            return TestExecution.builder()
                    .projectId(project.getId()).endpointId(endpoint.getId())
                    .endpointPath(endpoint.getPath()).httpMethod(endpoint.getMethod())
                    .testType(TestType.valueOf(testType)).requestUrl(fullUrl)
                    .requestHeaders(extractHeaders(headers))
                    .requestBody(entity.getBody() instanceof Map ? (Map<String, Object>) entity.getBody() : null)
                    .responseStatusCode(actualStatus).responseHeaders(extractHeaders(response.getHeaders()))
                    .responseBody(response.getBody()).responseTimeMs(responseTimeMs)
                    .expectedStatusCode(expectedStatus).statusCodeMatch(statusMatch)
                    .schemaValidationPassed(true)
                    .status(statusMatch ? TestStatus.SUCCESS : TestStatus.FAILED)
                    .errorMessage(statusMatch ? null : "Expected " + expectedStatus + " but got " + actualStatus)
                    .executedBy(executedBy)
                    .executionContext(executionContext != null ? executionContext : "manual")
                    .executionId(executionId).build();
        } catch (Exception e) {
            return TestExecution.builder()
                    .projectId(project.getId()).endpointId(endpoint.getId())
                    .endpointPath(endpoint.getPath()).httpMethod(endpoint.getMethod())
                    .testType(TestType.valueOf(testType)).status(TestStatus.ERROR)
                    .errorMessage(e.getMessage()).executedBy(executedBy)
                    .executionContext(executionContext != null ? executionContext : "manual")
                    .executionId(executionId).requestUrl("ERROR").responseStatusCode(0)
                    .responseTimeMs(0L).statusCodeMatch(false).schemaValidationPassed(false).build();
        }
    }

    private HttpHeaders buildHeaders(ProjectDTO project, EndpointDTO endpoint) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (Boolean.TRUE.equals(endpoint.getRequiresAuth()) && project.getCredentials() != null) {
            ApiCredentialsDTO creds = project.getCredentials();
            switch (project.getAuthType()) {
                case "BASIC" -> {
                    String encoded = Base64.getEncoder().encodeToString(
                            (creds.getBasicUsername() + ":" + creds.getBasicPassword()).getBytes());
                    headers.set("Authorization", "Basic " + encoded);
                }
                case "APIKEY" -> {
                    if ("HEADER".equals(creds.getApiKeyLocation()))
                        headers.set(creds.getApiKeyHeader(), creds.getApiKey());
                }
                case "BEARER" -> headers.set("Authorization", "Bearer " + creds.getBearerToken());
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
        try { return objectMapper.readValue(body, Map.class); }
        catch (Exception e) { return Map.of("raw", body); }
    }

    private ProjectExecutionResponse buildProjectExecutionResponse(
            ProjectExecution execution,
            Map<String, Integer> testsCountByType,
            Map<String, Integer> testsPassedByType) {
        Map<String, ProjectExecutionResponse.TestTypeStats> statsByType = new HashMap<>();
        for (String type : List.of("POSITIVE", "WRONG_TYPE", "MISSING_FIELDS", "BOUNDARY", "VALIDATION", "AUTH")) {
            int total  = testsCountByType.getOrDefault(type, 0);
            int passed = testsPassedByType.getOrDefault(type, 0);
            statsByType.put(type, ProjectExecutionResponse.TestTypeStats.builder()
                    .total(total).passed(passed).failed(total - passed)
                    .passRate(total > 0 ? (passed * 100.0 / total) : 0.0).build());
        }
        return ProjectExecutionResponse.builder()
                .executionId(execution.getId()).projectId(execution.getProjectId())
                .projectName(execution.getProjectName()).totalEndpoints(execution.getTotalEndpoints())
                .totalTests(execution.getTotalTests()).testsPassed(execution.getTestsPassed())
                .testsFailed(execution.getTestsFailed()).testsError(execution.getTestsError())
                .successRate(execution.getSuccessRate()).totalDurationMs(execution.getTotalDurationMs())
                .statsByType(statsByType).failedEndpoints(getFailedEndpointsSummary(execution.getProjectId()))
                .status(execution.getStatus().name()).executedAt(execution.getExecutedAt())
                .completedAt(execution.getCompletedAt()).build();
    }

    private List<ProjectExecutionResponse.EndpointSummary> getFailedEndpointsSummary(UUID projectId) {
        List<TestExecution> executions = testExecutionRepository.findByProjectId(projectId);
        Map<UUID, List<TestExecution>> grouped = executions.stream()
                .collect(Collectors.groupingBy(TestExecution::getEndpointId));
        return grouped.entrySet().stream().map(entry -> {
                    List<TestExecution> tests = entry.getValue();
                    int total  = tests.size();
                    int passed = (int) tests.stream().filter(t -> t.getStatus() == TestStatus.SUCCESS).count();
                    TestExecution first = tests.get(0);
                    return ProjectExecutionResponse.EndpointSummary.builder()
                            .endpointId(entry.getKey()).method(first.getHttpMethod()).path(first.getEndpointPath())
                            .totalTests(total).passed(passed).failed(total - passed)
                            .passRate(total > 0 ? (passed * 100.0 / total) : 0.0).build();
                }).filter(s -> s.getFailed() > 0)
                .sorted((a, b) -> Integer.compare(b.getFailed(), a.getFailed()))
                .limit(10).collect(Collectors.toList());
    }

    @Transactional
    public String deleteExecutionsByProjectId(UUID projectId) {
        int deletedTests    = testExecutionRepository.deleteByProjectId(projectId);
        int deletedProjects = projectExecutionRepository.deleteByProjectId(projectId);
        return String.format("Supprimé : %d ProjectExecution, %d TestExecution", deletedProjects, deletedTests);
    }
}