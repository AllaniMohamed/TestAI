package com.example.testservice.service;

import com.example.testservice.dto.*;
import com.example.testservice.entity.Test;
import com.example.testservice.feignclient.GenerateTestClient;
import com.example.testservice.feignclient.NotificationServiceClient;
import com.example.testservice.feignclient.NotificationServiceClient.NotificationRequest;
import com.example.testservice.repository.TestRepository;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@Slf4j
public class TestService {

    @Autowired
    private TestRepository testRepository;

    @Autowired
    private GenerateTestClient generateTestClient;

    @Autowired
    private NotificationServiceClient notificationServiceClient;

    // ── Helper : récupérer l'userId depuis le JWT ──────────────────────────
    private UUID getCurrentUserId() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
                String sub = jwt.getClaimAsString("sub");
                return sub != null ? UUID.fromString(sub) : null;
            }
        } catch (Exception e) {
            log.warn("Impossible de récupérer l'userId depuis le JWT: {}", e.getMessage());
        }
        return null;
    }

    // ── Helper : envoyer une notification sans bloquer ─────────────────────
    private void sendNotificationSafe(NotificationRequest request) {
        try {
            notificationServiceClient.sendNotification(request);
        } catch (Exception e) {
            log.warn("⚠️ Notification non envoyée (non bloquant): {}", e.getMessage());
        }
    }

    @Transactional
    public List<TestResponse> generateTests(List<EndpointDTO> endpoints) {
        List<GenerateTestResponse> generatedTests = generateTestClient.generateTests(endpoints);
        List<TestResponse> response = new ArrayList<>();

        UUID currentUserId = getCurrentUserId();
        UUID projectId = endpoints.isEmpty() ? null : endpoints.get(0).getProjectId();

        for (GenerateTestResponse gen : generatedTests) {
            Test test = testRepository
                    .findByProjectIdAndEndpointId(gen.getProjectId(), gen.getEndpointId())
                    .orElse(new Test());

            TestResponse singleResponse = new TestResponse();
            test.setEndpointId(gen.getEndpointId());
            test.setProjectId(gen.getProjectId());
            singleResponse.setProjectId(gen.getEndpointId());
            test.setEndpointPath(gen.getEndpoint());
            singleResponse.setEndpointPath(gen.getEndpoint());

            List<String> categories = new ArrayList<>();
            for (Map<String, Object> singleTest : gen.getTests()) {
                String category = singleTest.get("category").toString();
                switch (category) {
                    case "POSITIVE"       -> test.setPositive(singleTest);
                    case "WRONG_TYPE"     -> test.setWrongType(singleTest);
                    case "MISSING_FIELDS" -> test.setMissingFields(singleTest);
                    case "VALIDATION"     -> test.setValidation(singleTest);
                    case "BOUNDARY"       -> test.setBoundary(singleTest);
                    case "AUTH"           -> test.setAuth(singleTest);
                }
                categories.add(category);
            }
            singleResponse.setInsertedTests(categories);
            testRepository.save(test);
            response.add(singleResponse);
        }

        // ⭐ Notifier l'utilisateur que la génération est terminée
        if (currentUserId != null && projectId != null) {
            int endpointCount = endpoints.size();
            sendNotificationSafe(new NotificationRequest(
                    currentUserId,
                    "GENERATION_DONE",
                    "✨ Génération terminée",
                    endpointCount + " endpoint(s) — " + response.size() + " test(s) générés avec succès",
                    projectId,
                    Map.of("endpointCount", endpointCount, "testsCount", response.size())
            ));
        }

        return response;
    }

    public List<Test> getAllTests() {
        return testRepository.findAll();
    }

    public List<Test> getAllTestsByProjectId(UUID projectId) {
        return testRepository.findAllByProjectId(projectId).orElse(new ArrayList<>());
    }

    public Test getTestsByProjectIdAndEndpointId(UUID projectId, UUID endpointId) {
        return testRepository.findByProjectIdAndEndpointId(projectId, endpointId).orElse(null);
    }

    @Transactional
    public Test updateTest(Test updatedTest) {
        Test oldTest = testRepository.findById(updatedTest.getId()).orElse(null);
        if (oldTest != null) {
            oldTest.setPositive(updatedTest.getPositive());
            oldTest.setValidation(updatedTest.getAuth());
            oldTest.setBoundary(updatedTest.getBoundary());
            oldTest.setMissingFields(updatedTest.getMissingFields());
            oldTest.setWrongType(updatedTest.getWrongType());
            oldTest.setAuth(updatedTest.getAuth());
            return testRepository.save(oldTest);
        }
        return null;
    }

    @Transactional
    public Map<String, String> deleteByProjectId(UUID projectId) {
        Map<String, String> response = new HashMap<>();
        try {
            testRepository.deleteByProjectId(projectId);
            response.put("success", "Tests for Project " + projectId + " Deleted Successfully!!");
        } catch (Exception e) {
            response.put("failure", e.toString());
        }
        return response;
    }

    @Transactional
    public Map<String, String> deleteByProjectIdAndEndpointId(UUID projectId, UUID endpointId) {
        Map<String, String> response = new HashMap<>();
        try {
            testRepository.deleteByProjectIdAndEndpointId(projectId, endpointId);
            response.put("success", "Tests for Endpoint " + endpointId + " in Project " + projectId + " Deleted Successfully!!");
        } catch (Exception e) {
            response.put("failure", e.toString());
        }
        return response;
    }
}