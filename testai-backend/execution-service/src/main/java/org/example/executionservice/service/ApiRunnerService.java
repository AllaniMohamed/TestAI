package org.example.executionservice.service;

import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.example.executionservice.dto.ApiResponseDTO;
import org.example.executionservice.dto.ExecuteApiRequestDTO;
import org.example.executionservice.dto.SavedApiRequestDTO;
import org.example.executionservice.entity.ApiRequest;
import org.example.executionservice.repository.ApiRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

@Slf4j
@Service
public class ApiRunnerService {

    @Autowired
    private ApiRequestRepository apiRequestRepository;

    @Autowired
    private RestTemplate restTemplate;

    // ==========================================
    // EXÉCUTION DE REQUÊTE HTTP
    // ==========================================

    /**
     * Exécuter une requête HTTP et retourner la réponse
     */
    @Transactional
    public ApiResponseDTO executeRequest(ExecuteApiRequestDTO requestDTO, UUID userId) {
        log.info("🚀 Exécution requête HTTP: {} {}", requestDTO.getMethod(), requestDTO.getUrl());

        long startTime = System.currentTimeMillis();

        try {
            // 1. Construire l'URL avec query params et path variables
            String finalUrl = buildUrl(requestDTO);

            // 2. Construire les headers avec authentification
            HttpHeaders headers = buildHeaders(requestDTO);

            // 3. Préparer le body
            String body = requestDTO.getRequestBody();

            // 4. Créer l'entity HTTP
            HttpEntity<String> entity = new HttpEntity<>(body, headers);

            // 5. Déterminer la méthode HTTP
            HttpMethod httpMethod = HttpMethod.valueOf(requestDTO.getMethod().toUpperCase());

            // 6. EXÉCUTER la requête
            ResponseEntity<String> response;

            try {
                response = restTemplate.exchange(
                        finalUrl,
                        httpMethod,
                        entity,
                        String.class
                );
            } catch (HttpClientErrorException | HttpServerErrorException e) {
                // Capturer les erreurs 4xx et 5xx (normal pour certains tests)
                response = ResponseEntity
                        .status(e.getStatusCode())
                        .headers(e.getResponseHeaders())
                        .body(e.getResponseBodyAsString());
            }

            long endTime = System.currentTimeMillis();
            long duration = endTime - startTime;

            // 7. Construire la réponse
            ApiResponseDTO responseDTO = ApiResponseDTO.builder()
                    .status(response.getStatusCode().value())
                    .statusText(response.getStatusCode().toString())
                    .headers(convertHeaders(response.getHeaders()))
                    .body(response.getBody())
                    .responseTimeMs(duration)
                    .size(formatSize(response.getBody()))
                    .success(response.getStatusCode().is2xxSuccessful())
                    .build();

            // 8. Sauvegarder si demandé
            if (Boolean.TRUE.equals(requestDTO.getSaveAfterExecution())) {
                saveRequest(requestDTO, userId);
            }

            log.info("✅ Requête exécutée avec succès: {} en {}ms", response.getStatusCode(), duration);
            return responseDTO;

        } catch (Exception e) {
            long endTime = System.currentTimeMillis();
            long duration = endTime - startTime;

            log.error("❌ Erreur lors de l'exécution: {}", e.getMessage(), e);

            return ApiResponseDTO.builder()
                    .status(0)
                    .statusText("ERROR")
                    .body(null)
                    .responseTimeMs(duration)
                    .success(false)
                    .errorMessage(e.getMessage())
                    .build();
        }
    }

    // ==========================================
    // CONSTRUCTION URL
    // ==========================================

    private String buildUrl(ExecuteApiRequestDTO requestDTO) {
        String url = requestDTO.getUrl();

        // 1. Remplacer les path variables {key} par leur valeur
        if (requestDTO.getPathVariables() != null && !requestDTO.getPathVariables().isEmpty()) {
            for (Map.Entry<String, String> entry : requestDTO.getPathVariables().entrySet()) {
                url = url.replace("{" + entry.getKey() + "}", entry.getValue());
            }
        }

        // 2. Ajouter les query params
        if (requestDTO.getQueryParams() != null && !requestDTO.getQueryParams().isEmpty()) {
            UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(url);
            requestDTO.getQueryParams().forEach(builder::queryParam);
            url = builder.toUriString();
        }

        return url;
    }

    // ==========================================
    // CONSTRUCTION HEADERS
    // ==========================================

    private HttpHeaders buildHeaders(ExecuteApiRequestDTO requestDTO) {
        HttpHeaders headers = new HttpHeaders();

        // 1. Headers de base
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

        // 2. Headers personnalisés
        if (requestDTO.getHeaders() != null && !requestDTO.getHeaders().isEmpty()) {
            requestDTO.getHeaders().forEach(headers::set);
        }

        // 3. Authentification
        addAuthentication(headers, requestDTO);

        return headers;
    }

    private void addAuthentication(HttpHeaders headers, ExecuteApiRequestDTO requestDTO) {
        if (requestDTO.getAuthType() == null || "NONE".equals(requestDTO.getAuthType())) {
            return;
        }

        Map<String, String> authConfig = requestDTO.getAuthConfig();
        if (authConfig == null || authConfig.isEmpty()) {
            return;
        }

        switch (requestDTO.getAuthType().toUpperCase()) {
            case "BEARER":
                String token = authConfig.get("token");
                if (token != null && !token.isEmpty()) {
                    headers.set("Authorization", "Bearer " + token);
                }
                break;

            case "BASIC":
                String username = authConfig.get("username");
                String password = authConfig.get("password");
                if (username != null && password != null) {
                    String auth = username + ":" + password;
                    String encodedAuth = Base64.getEncoder()
                            .encodeToString(auth.getBytes(StandardCharsets.UTF_8));
                    headers.set("Authorization", "Basic " + encodedAuth);
                }
                break;

            case "API_KEY":
                String apiKey = authConfig.get("key");
                String headerName = authConfig.getOrDefault("header", "X-API-Key");
                String location = authConfig.getOrDefault("location", "HEADER");

                if ("HEADER".equals(location) && apiKey != null) {
                    headers.set(headerName, apiKey);
                }
                // Si location = QUERY, c'est géré dans buildUrl via queryParams
                break;
        }
    }

    // ==========================================
    // SAUVEGARDE DE REQUÊTE
    // ==========================================

    /**
     * Sauvegarder une requête dans l'historique
     */
    @Transactional
    public SavedApiRequestDTO saveRequest(ExecuteApiRequestDTO requestDTO, UUID userId) {
        ApiRequest apiRequest = ApiRequest.builder()
                .userId(userId)
                .name(requestDTO.getRequestName() != null ? requestDTO.getRequestName() : generateRequestName(requestDTO))
                .description(requestDTO.getRequestDescription())
                .method(ApiRequest.HttpMethod.valueOf(requestDTO.getMethod().toUpperCase()))
                .url(requestDTO.getUrl())
                .headers(requestDTO.getHeaders())
                .queryParams(requestDTO.getQueryParams())
                .pathVariables(requestDTO.getPathVariables())
                .authType(parseAuthType(requestDTO.getAuthType()))
                .authConfig(requestDTO.getAuthConfig())
                .requestBody(requestDTO.getRequestBody())
                .lastExecutedAt(Instant.now())
                .executionCount(1)
                .build();

        ApiRequest saved = apiRequestRepository.save(apiRequest);
        log.info("💾 Requête sauvegardée: {} (ID: {})", saved.getName(), saved.getId());

        return toDTO(saved);
    }

    /**
     * Créer une nouvelle requête vide
     */
    @Transactional
    public SavedApiRequestDTO createRequest(SavedApiRequestDTO requestDTO, UUID userId) {
        ApiRequest apiRequest = ApiRequest.builder()
                .userId(userId)
                .name(requestDTO.getName())
                .description(requestDTO.getDescription())
                .method(ApiRequest.HttpMethod.valueOf(requestDTO.getMethod().toUpperCase()))
                .url(requestDTO.getUrl())
                .headers(requestDTO.getHeaders())
                .queryParams(requestDTO.getQueryParams())
                .pathVariables(requestDTO.getPathVariables())
                .authType(parseAuthType(requestDTO.getAuthType()))
                .authConfig(requestDTO.getAuthConfig())
                .requestBody(requestDTO.getRequestBody())
                .build();

        ApiRequest saved = apiRequestRepository.save(apiRequest);
        log.info("📝 Nouvelle requête créée: {} (ID: {})", saved.getName(), saved.getId());

        return toDTO(saved);
    }

    /**
     * Récupérer toutes les requêtes d'un utilisateur
     */
    @Transactional
    public List<SavedApiRequestDTO> getUserRequests(UUID userId, String orderBy) {
        List<ApiRequest> requests;

        if ("lastExecuted".equals(orderBy)) {
            requests = apiRequestRepository.findByUserIdOrderByLastExecutedAtDesc(userId);
        } else {
            requests = apiRequestRepository.findByUserIdOrderByCreatedAtDesc(userId);
        }

        return requests.stream()
                .map(this::toDTO)
                .toList();
    }

    /**
     * Récupérer une requête par ID
     */
    @Transactional
    public SavedApiRequestDTO getRequestById(UUID requestId, UUID userId) {
        ApiRequest request = apiRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Requête non trouvée"));

        // Vérifier que la requête appartient bien à l'utilisateur
        if (!request.getUserId().equals(userId)) {
            throw new RuntimeException("Accès non autorisé");
        }

        return toDTO(request);
    }

    /**
     * Mettre à jour une requête
     */
    @Transactional
    public SavedApiRequestDTO updateRequest(UUID requestId, SavedApiRequestDTO requestDTO, UUID userId) {
        ApiRequest existing = apiRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Requête non trouvée"));

        if (!existing.getUserId().equals(userId)) {
            throw new RuntimeException("Accès non autorisé");
        }

        // Mise à jour
        existing.setName(requestDTO.getName());
        existing.setDescription(requestDTO.getDescription());
        existing.setMethod(ApiRequest.HttpMethod.valueOf(requestDTO.getMethod().toUpperCase()));
        existing.setUrl(requestDTO.getUrl());
        existing.setHeaders(requestDTO.getHeaders());
        existing.setQueryParams(requestDTO.getQueryParams());
        existing.setPathVariables(requestDTO.getPathVariables());
        existing.setAuthType(parseAuthType(requestDTO.getAuthType()));
        existing.setAuthConfig(requestDTO.getAuthConfig());
        existing.setRequestBody(requestDTO.getRequestBody());

        ApiRequest updated = apiRequestRepository.save(existing);
        log.info("✏️ Requête mise à jour: {} (ID: {})", updated.getName(), updated.getId());

        return toDTO(updated);
    }

    /**
     * Supprimer une requête
     */
    @Transactional
    public void deleteRequest(UUID requestId, UUID userId) {
        ApiRequest request = apiRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Requête non trouvée"));

        if (!request.getUserId().equals(userId)) {
            throw new RuntimeException("Accès non autorisé");
        }

        apiRequestRepository.delete(request);
        log.info("🗑️ Requête supprimée: {} (ID: {})", request.getName(), requestId);
    }

    /**
     * Incrémenter le compteur d'exécution
     */
    @Transactional
    public void incrementExecutionCount(UUID requestId) {
        apiRequestRepository.findById(requestId).ifPresent(request -> {
            request.setExecutionCount(request.getExecutionCount() + 1);
            request.setLastExecutedAt(Instant.now());
            apiRequestRepository.save(request);
        });
    }

    // ==========================================
    // HELPERS
    // ==========================================

    private Map<String, String> convertHeaders(HttpHeaders headers) {
        Map<String, String> result = new HashMap<>();
        headers.forEach((key, values) -> {
            if (values != null && !values.isEmpty()) {
                result.put(key, values.get(0));
            }
        });
        return result;
    }

    private String formatSize(String body) {
        if (body == null) return "0B";

        long bytes = body.getBytes(StandardCharsets.UTF_8).length;
        if (bytes < 1024) return bytes + "B";
        if (bytes < 1024 * 1024) return String.format("%.1fKB", bytes / 1024.0);
        return String.format("%.1fMB", bytes / (1024.0 * 1024.0));
    }

    private String generateRequestName(ExecuteApiRequestDTO requestDTO) {
        return requestDTO.getMethod() + " " + extractPath(requestDTO.getUrl());
    }

    private String extractPath(String url) {
        try {
            return url.substring(url.indexOf("/", 8)); // Après http://
        } catch (Exception e) {
            return url;
        }
    }

    private ApiRequest.AuthType parseAuthType(String authType) {
        if (authType == null || authType.isEmpty()) {
            return ApiRequest.AuthType.NONE;
        }
        try {
            return ApiRequest.AuthType.valueOf(authType.toUpperCase());
        } catch (IllegalArgumentException e) {
            return ApiRequest.AuthType.NONE;
        }
    }

    private SavedApiRequestDTO toDTO(ApiRequest entity) {
        return SavedApiRequestDTO.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .name(entity.getName())
                .description(entity.getDescription())
                .method(entity.getMethod().name())
                .url(entity.getUrl())
                .headers(entity.getHeaders())
                .queryParams(entity.getQueryParams())
                .pathVariables(entity.getPathVariables())
                .authType(entity.getAuthType().name())
                .authConfig(entity.getAuthConfig())
                .requestBody(entity.getRequestBody())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .lastExecutedAt(entity.getLastExecutedAt())
                .executionCount(entity.getExecutionCount())
                .build();
    }
}