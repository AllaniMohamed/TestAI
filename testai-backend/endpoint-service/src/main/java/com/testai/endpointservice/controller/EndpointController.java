package com.testai.endpointservice.controller;

import com.testai.endpointservice.dto.CreateEndpointRequest;
import com.testai.endpointservice.dto.EndpointDTO;
import com.testai.endpointservice.dto.ScanSwaggerRequest;
import com.testai.endpointservice.dto.ScanSwaggerResponse;
import com.testai.endpointservice.entity.Endpoint;
import com.testai.endpointservice.service.EndpointService;
import com.testai.endpointservice.service.SwaggerScannerService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Contrôleur pour gérer les endpoints
 */
@RestController
@RequestMapping("/api/endpoints")
@RequiredArgsConstructor
@Slf4j
public class EndpointController {

    private final EndpointService endpointService;
    private final SwaggerScannerService swaggerScannerService;

    /**
     * Scanner les endpoints depuis une URL Swagger
     * POST /api/endpoints/scan
     */
    @PostMapping("/scan")
    public ResponseEntity<ScanSwaggerResponse> scanSwagger(@RequestBody ScanSwaggerRequest request) {
        log.info("🔍 Demande de scan Swagger pour le projet {}", request.getProjectId());

        try {
            ScanSwaggerResponse response = swaggerScannerService.scanSwagger(
                    request.getProjectId(),
                    request.getSwaggerUrl()
            );
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("❌ Erreur lors du scan Swagger : {}", e.getMessage());
            ScanSwaggerResponse errorResponse = new ScanSwaggerResponse(
                    false,
                    "Erreur : " + e.getMessage(),
                    0, 0, 0, 0,
                    null
            );
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    /**
     * Créer un endpoint manuellement
     * POST /api/endpoints
     */
    @PostMapping
    public ResponseEntity<?> createEndpoint(@RequestBody CreateEndpointRequest request) {
        log.info("📝 Création d'un endpoint manuel");

        try {
            EndpointDTO endpoint = endpointService.createEndpoint(request);
            return ResponseEntity.ok(endpoint);

        } catch (Exception e) {
            log.error("❌ Erreur lors de la création de l'endpoint : {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    /**
     * Récupérer tous les endpoints d'un projet
     * GET /api/endpoints/project/{projectId}
     */
    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<EndpointDTO>> getEndpointsByProjectId(@PathVariable UUID projectId) {
        log.info("📋 Récupération des endpoints du projet {}", projectId);

        List<EndpointDTO> endpoints = endpointService.getEndpointsByProjectId(projectId);
        return ResponseEntity.ok(endpoints);
    }

    /**
     * Récupérer tous les endpoints
     * GET /api/endpoints
     */
    @GetMapping
    public ResponseEntity<List<EndpointDTO>> getAllEndpoints() {
        log.info("📋 Récupération de tous les endpoints");

        List<EndpointDTO> endpoints = endpointService.getAllEndpoints();
        return ResponseEntity.ok(endpoints);
    }

    /**
     * Récupérer un endpoint par son ID
     * GET /api/endpoints/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getEndpointById(@PathVariable UUID id) {
        log.info("🔍 Récupération de l'endpoint {}", id);

        try {
            EndpointDTO endpoint = endpointService.getEndpointById(id);
            return ResponseEntity.ok(endpoint);

        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Récupérer les endpoints par méthode HTTP
     * GET /api/endpoints/method/{method}
     */
    @GetMapping("/method/{method}")
    public ResponseEntity<List<EndpointDTO>> getEndpointsByMethod(@PathVariable Endpoint.HttpMethod method) {
        log.info("📋 Récupération des endpoints avec la méthode {}", method);

        List<EndpointDTO> endpoints = endpointService.getEndpointsByMethod(method);
        return ResponseEntity.ok(endpoints);
    }

    /**
     * Récupérer les endpoints par type de découverte
     * GET /api/endpoints/discovery/{type}
     */
    @GetMapping("/discovery/{type}")
    public ResponseEntity<List<EndpointDTO>> getEndpointsByDiscoveryType(
            @PathVariable Endpoint.DiscoveryType type) {
        log.info("📋 Récupération des endpoints découverts par {}", type);

        List<EndpointDTO> endpoints = endpointService.getEndpointsByDiscoveryType(type);
        return ResponseEntity.ok(endpoints);
    }

    /**
     * Mettre à jour un endpoint
     * PUT /api/endpoints/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateEndpoint(
            @PathVariable UUID id,
            @RequestBody CreateEndpointRequest request) {
        log.info("✏️ Mise à jour de l'endpoint {}", id);

        try {
            EndpointDTO endpoint = endpointService.updateEndpoint(id, request);
            return ResponseEntity.ok(endpoint);

        } catch (Exception e) {
            log.error("❌ Erreur lors de la mise à jour : {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    /**
     * Supprimer un endpoint
     * DELETE /api/endpoints/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteEndpoint(@PathVariable UUID id) {
        log.info("🗑️ Suppression de l'endpoint {}", id);

        try {
            endpointService.deleteEndpoint(id);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Endpoint supprimé avec succès"
            ));

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    /**
     * Supprimer tous les endpoints d'un projet
     * DELETE /api/endpoints/project/{projectId}
     */
    @DeleteMapping("/project/{projectId}")
    public ResponseEntity<?> deleteEndpointsByProjectId(@PathVariable UUID projectId) {
        log.info("🗑️ Suppression de tous les endpoints du projet {}", projectId);

        try {
            endpointService.deleteEndpointsByProjectId(projectId);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Tous les endpoints du projet ont été supprimés"
            ));

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    /**
     * Compter les endpoints d'un projet
     * GET /api/endpoints/project/{projectId}/count
     */
    @GetMapping("/project/{projectId}/count")
    public ResponseEntity<Map<String, Object>> countEndpointsByProjectId(@PathVariable UUID projectId) {
        log.info("🔢 Comptage des endpoints du projet {}", projectId);

        long count = endpointService.countEndpointsByProjectId(projectId);
        return ResponseEntity.ok(Map.of(
                "projectId", projectId,
                "count", count
        ));
    }
    
    @GetMapping("/project/{projectId}/tags")
    public ResponseEntity<List<String>> getTagsByProjectId(@PathVariable UUID projectId) {
        List<String> tags = endpointService.getDistinctTagsByProjectId(projectId);
        return ResponseEntity.ok(tags);
    }

    @GetMapping("/project/{projectId}/tag/{tag}")
    public ResponseEntity<List<EndpointDTO>> getEndpointsByProjectIdAndTag(
            @PathVariable UUID projectId,
            @PathVariable String tag) {
        List<EndpointDTO> endpoints = endpointService.getEndpointsByProjectIdAndTag(projectId, tag);
        return ResponseEntity.ok(endpoints);
    }
}