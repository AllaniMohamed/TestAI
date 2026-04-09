package org.example.executionservice.controller;

import lombok.extern.slf4j.Slf4j;
import org.example.executionservice.dto.ApiResponseDTO;
import org.example.executionservice.dto.ExecuteApiRequestDTO;
import org.example.executionservice.dto.SavedApiRequestDTO;
import org.example.executionservice.service.ApiRunnerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/executions/api-runner")
public class ApiRunnerController {

    @Autowired
    private ApiRunnerService apiRunnerService;

    // ==========================================
    // EXÉCUTION
    // ==========================================

    @PostMapping("/execute")
    public ResponseEntity<ApiResponseDTO> executeRequest(
            @RequestBody ExecuteApiRequestDTO requestDTO,
            @RequestHeader("X-User-Id") UUID userId
    ) {
        log.info("📨 Requête d'exécution reçue: {} {}", requestDTO.getMethod(), requestDTO.getUrl());
        ApiResponseDTO response = apiRunnerService.executeRequest(requestDTO, userId);
        return ResponseEntity.ok(response);
    }

    // ==========================================
    // GESTION DES REQUÊTES SAUVEGARDÉES
    // ==========================================

    @PostMapping("/requests")
    public ResponseEntity<SavedApiRequestDTO> createRequest(
            @RequestBody SavedApiRequestDTO requestDTO,
            @RequestHeader("X-User-Id") UUID userId
    ) {
        log.info("📝 Création d'une nouvelle requête: {}", requestDTO.getName());
        SavedApiRequestDTO saved = apiRunnerService.createRequest(requestDTO, userId);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/requests")
    public ResponseEntity<List<SavedApiRequestDTO>> getUserRequests(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestParam(defaultValue = "created") String orderBy
    ) {
        log.info("📋 Récupération des requêtes de l'utilisateur: {}", userId);
        List<SavedApiRequestDTO> requests = apiRunnerService.getUserRequests(userId, orderBy);
        return ResponseEntity.ok(requests);
    }

    @GetMapping("/requests/{requestId}")
    public ResponseEntity<SavedApiRequestDTO> getRequest(
            @PathVariable UUID requestId,
            @RequestHeader("X-User-Id") UUID userId
    ) {
        log.info("🔍 Récupération de la requête: {}", requestId);
        SavedApiRequestDTO request = apiRunnerService.getRequestById(requestId, userId);
        return ResponseEntity.ok(request);
    }

    @PutMapping("/requests/{requestId}")
    public ResponseEntity<SavedApiRequestDTO> updateRequest(
            @PathVariable UUID requestId,
            @RequestBody SavedApiRequestDTO requestDTO,
            @RequestHeader("X-User-Id") UUID userId
    ) {
        log.info("✏️ Mise à jour de la requête: {}", requestId);
        SavedApiRequestDTO updated = apiRunnerService.updateRequest(requestId, requestDTO, userId);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/requests/{requestId}")
    public ResponseEntity<Map<String, String>> deleteRequest(
            @PathVariable UUID requestId,
            @RequestHeader("X-User-Id") UUID userId
    ) {
        log.info("🗑️ Suppression de la requête: {}", requestId);
        apiRunnerService.deleteRequest(requestId, userId);
        return ResponseEntity.ok(Map.of(
                "message", "Requête supprimée avec succès",
                "requestId", requestId.toString()
        ));
    }

    @PostMapping("/requests/{requestId}/execute")
    public ResponseEntity<ApiResponseDTO> executeSavedRequest(
            @PathVariable UUID requestId,
            @RequestHeader("X-User-Id") UUID userId
    ) {
        log.info("🚀 Exécution de la requête sauvegardée: {}", requestId);

        // 1. Récupérer la requête sauvegardée
        SavedApiRequestDTO savedRequest = apiRunnerService.getRequestById(requestId, userId);

        // 2. Convertir en ExecuteApiRequestDTO
        ExecuteApiRequestDTO executeDTO = ExecuteApiRequestDTO.builder()
                .method(savedRequest.getMethod())
                .url(savedRequest.getUrl())
                .headers(savedRequest.getHeaders())
                .queryParams(savedRequest.getQueryParams())
                .pathVariables(savedRequest.getPathVariables())
                .authType(savedRequest.getAuthType())
                .authConfig(savedRequest.getAuthConfig())
                .requestBody(savedRequest.getRequestBody())
                .build();

        // 3. Exécuter
        ApiResponseDTO response = apiRunnerService.executeRequest(executeDTO, userId);

        // 4. Incrémenter le compteur d'exécution
        apiRunnerService.incrementExecutionCount(requestId);

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/requests")
    public ResponseEntity<Map<String, String>> deleteAllRequests(
            @RequestHeader("X-User-Id") UUID userId
    ) {
        log.info("🗑️ Suppression de toutes les requêtes de l'utilisateur: {}", userId);
        List<SavedApiRequestDTO> requests = apiRunnerService.getUserRequests(userId, "created");
        requests.forEach(req -> apiRunnerService.deleteRequest(req.getId(), userId));

        return ResponseEntity.ok(Map.of(
                "message", "Toutes les requêtes ont été supprimées",
                "count", String.valueOf(requests.size())
        ));
    }
}