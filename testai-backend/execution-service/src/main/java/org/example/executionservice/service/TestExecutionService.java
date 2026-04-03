package org.example.executionservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.executionservice.dto.*;
import org.example.executionservice.entity.TestExecution;
import org.example.executionservice.entity.TestExecution.TestStatus;
import org.example.executionservice.entity.TestExecution.TestType;
import org.example.executionservice.feignclient.*;
import org.example.executionservice.repository.TestExecutionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class TestExecutionService {

    private final TestExecutionRepository executionRepository;
    private final ProjectServiceClient projectServiceClient;
    private final EndpointServiceClient endpointServiceClient;
    private final TestServiceClient testServiceClient;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public ExecuteTestResponse executeTest(ExecuteTestRequest request) {
        log.info("🚀 Exécution test: projectId={}, endpointId={}, type={}",
                request.getProjectId(), request.getEndpointId(), request.getTestType());

        Instant startTime = Instant.now();

        try {
            ProjectDTO project = projectServiceClient.getProjectById(request.getProjectId());
            EndpointDTO endpoint = endpointServiceClient.getEndpointById(request.getEndpointId());
            TestDTO tests = testServiceClient.getTestsByProjectIdAndEndpointId(
                    request.getProjectId(), request.getEndpointId());

            Map<String, Object> testData = selectTest(tests, request.getTestType());
            if (testData == null) {
                throw new RuntimeException("Test type " + request.getTestType() + " not found");
            }

            // Extract the "response" object (all tests have this structure)
            Map<String, Object> responseObj = (Map<String, Object>) testData.get("response");
            if (responseObj == null) {
                throw new RuntimeException("Missing 'response' field in test data");
            }

            // 1. Build full URL with path params and query params
            String fullPath = endpoint.getPath();
            // Path parameters
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

            // 2. Build headers (merge test headers with auth headers)
            HttpHeaders headers = buildHeaders(project, endpoint);
            Map<String, String> testHeaders = (Map<String, String>) responseObj.getOrDefault("headers", Map.of());
            testHeaders.forEach(headers::set);

            // 3. Prepare request entity (no body for GET/DELETE)
            HttpEntity<?> entity;
            String method = endpoint.getMethod();
            if ("GET".equalsIgnoreCase(method) || "DELETE".equalsIgnoreCase(method)) {
                entity = new HttpEntity<>(headers);
            } else {
                Object payload = responseObj.get("payload");
                entity = new HttpEntity<>(payload, headers);
            }

            // 4. Execute request
            long execStart = System.currentTimeMillis();
            ResponseEntity<Map> response;
            try {
                response = restTemplate.exchange(
                        fullUrl,
                        HttpMethod.valueOf(method.toUpperCase()),
                        entity,
                        Map.class
                );
            } catch (HttpClientErrorException | HttpServerErrorException ex) {
                response = new ResponseEntity<>(
                        parseBody(ex.getResponseBodyAsString()),
                        ex.getResponseHeaders(),
                        ex.getStatusCode()
                );
            }
            long responseTimeMs = System.currentTimeMillis() - execStart;

            // 5. Validate response
            Integer expectedStatus = (Integer) responseObj.get("expectedStatus");
            TestValidationResult validation = validateResponse(response, expectedStatus);

            // 6. Save execution
            TestExecution execution = saveExecution(request, project, endpoint, fullUrl,
                    entity, response, responseTimeMs, validation, startTime);

            return ExecuteTestResponse.builder()
                    .executionId(execution.getId())
                    .status(execution.getStatus().name())
                    .statusCode(execution.getResponseStatusCode())
                    .passed(validation.isPassed())
                    .responseTimeMs(responseTimeMs)
                    .responseBody(execution.getResponseBody())
                    .errorMessage(execution.getErrorMessage())
                    .validationErrors(execution.getValidationErrors())
                    .build();

        } catch (Exception e) {
            log.error("❌ Erreur exécution test: {}", e.getMessage(), e);
            TestExecution errorExecution = saveError(request, e, startTime);
            return ExecuteTestResponse.builder()
                    .executionId(errorExecution.getId())
                    .status("ERROR")
                    .passed(false)
                    .errorMessage(e.getMessage())
                    .build();
        }
    }

    private Map<String, Object> selectTest(TestDTO tests, String testType) {
        return switch (testType.toUpperCase()) {
            case "POSITIVE" -> tests.getPositive();
            case "WRONG_TYPE" -> tests.getWrongType();
            case "MISSING_FIELDS" -> tests.getMissingFields();
            case "VALIDATION" -> tests.getValidation();
            case "BOUNDARY" -> tests.getBoundary();
            case "AUTH" -> tests.getAuth();
            default -> null;
        };
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
                    if ("HEADER".equals(creds.getApiKeyLocation())) {
                        headers.set(creds.getApiKeyHeader(), creds.getApiKey());
                    }
                    break;
                case "BEARER":
                    headers.set("Authorization", "Bearer " + creds.getBearerToken());
                    break;
            }
        }
        return headers;
    }

    private TestValidationResult validateResponse( ResponseEntity<Map> response, Integer expectedStatus) {
        TestValidationResult result = new TestValidationResult();
        int actualCode = response.getStatusCode().value();
        boolean statusMatch = expectedStatus != null && expectedStatus.equals(actualCode);
        result.setStatusCodeMatch(statusMatch);
        result.setSchemaValidationPassed(true); // TODO: implement JSON Schema validation
        result.setPassed(statusMatch);
        if (!statusMatch) {
            Map<String, Object> errors = new HashMap<>();
            errors.put("status_code", "Expected " + expectedStatus + " but got " + actualCode);
            result.setValidationErrors(errors);
        }
        return result;
    }

    private TestExecution saveExecution(
            ExecuteTestRequest request,
            ProjectDTO project,
            EndpointDTO endpoint,
            String fullUrl,
            HttpEntity<?> entity,
            ResponseEntity<Map> response,
            long responseTimeMs,
            TestValidationResult validation,
            Instant startTime
    ) {
        TestExecution execution = TestExecution.builder()
                .projectId(request.getProjectId())
                .endpointId(request.getEndpointId())
                .endpointPath(endpoint.getPath())
                .httpMethod(endpoint.getMethod())
                .testType(TestType.valueOf(request.getTestType().toUpperCase()))
                .requestUrl(fullUrl)
                .requestHeaders(extractHeaders(entity.getHeaders()))
                .requestBody(entity.getBody() instanceof Map ? (Map<String, Object>) entity.getBody() : null)
                .responseStatusCode(response.getStatusCode().value())
                .responseHeaders(extractHeaders(response.getHeaders()))
                .responseBody(response.getBody())
                .responseTimeMs(responseTimeMs)
                .expectedStatusCode((Integer) null) // could be set from test data
                .statusCodeMatch(validation.isStatusCodeMatch())
                .schemaValidationPassed(validation.isSchemaValidationPassed())
                .status(validation.isPassed() ? TestStatus.SUCCESS : TestStatus.FAILED)
                .errorMessage(validation.isPassed() ? null : "Test failed")
                .validationErrors(validation.getValidationErrors())
                .executedBy(request.getExecutedBy())
                .executionContext("manual")
                .build();
        return executionRepository.save(execution);
    }

    private TestExecution saveError(ExecuteTestRequest request, Exception e, Instant startTime) {
        TestExecution execution = TestExecution.builder()
                .projectId(request.getProjectId())
                .endpointId(request.getEndpointId())
                .testType(TestType.valueOf(request.getTestType().toUpperCase()))
                .status(TestStatus.ERROR)
                .errorMessage(e.getMessage())
                .executedBy(request.getExecutedBy())
                .executionContext("manual")
                .build();
        return executionRepository.save(execution);
    }

    private Map<String, String> extractHeaders(HttpHeaders headers) {
        if (headers == null) return Map.of();
        Map<String, String> map = new HashMap<>();
        headers.forEach((key, values) -> map.put(key, String.join(",", values)));
        return map;
    }

    private Map<String, Object> parseBody(String body) {
        try {
            return objectMapper.readValue(body, Map.class);
        } catch (Exception e) {
            return Map.of("raw", body);
        }
    }

    @lombok.Data
    private static class TestValidationResult {
        private boolean statusCodeMatch;
        private boolean schemaValidationPassed;
        private boolean passed;
        private Map<String, Object> validationErrors;
    }
}