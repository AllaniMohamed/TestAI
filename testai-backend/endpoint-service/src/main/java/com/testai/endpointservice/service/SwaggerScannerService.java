package com.testai.endpointservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.testai.endpointservice.dto.EndpointDTO;
import com.testai.endpointservice.dto.ScanSwaggerResponse;
import com.testai.endpointservice.entity.Endpoint;
import com.testai.endpointservice.repository.EndpointRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SwaggerScannerService {

    private final EndpointRepository endpointRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public ScanSwaggerResponse scanSwagger(UUID projectId, String swaggerUrl) {
        log.info("🔍 Début du scan Swagger pour le projet {} depuis {}", projectId, swaggerUrl);

        try {
            String swaggerJson = restTemplate.getForObject(swaggerUrl, String.class);
            if (swaggerJson == null || swaggerJson.isEmpty()) {
                return createErrorResponse("Le fichier Swagger est vide");
            }

            JsonNode rootNode = objectMapper.readTree(swaggerJson);
            String version = detectOpenApiVersion(rootNode);
            log.info("📋 Version OpenAPI détectée : {}", version);

            List<Endpoint> endpoints;
            if (version.startsWith("3.")) {
                endpoints = extractEndpointsFromOpenApi3(projectId, rootNode);
            } else if (version.startsWith("2.")) {
                endpoints = extractEndpointsFromSwagger2(projectId, rootNode);
            } else {
                return createErrorResponse("Version OpenAPI non supportée : " + version);
            }

            ScanSwaggerResponse response = saveEndpoints(projectId, endpoints);
            log.info("✅ Scan terminé : {} endpoints traités", response.getTotalEndpoints());
            return response;

        } catch (Exception e) {
            log.error("❌ Erreur lors du scan Swagger : {}", e.getMessage(), e);
            return createErrorResponse("Erreur : " + e.getMessage());
        }
    }

    private String detectOpenApiVersion(JsonNode rootNode) {
        if (rootNode.has("openapi")) {
            return rootNode.get("openapi").asText();
        }
        if (rootNode.has("swagger")) {
            return rootNode.get("swagger").asText();
        }
        return "unknown";
    }

    // ========================= OpenAPI 3 =========================
    private List<Endpoint> extractEndpointsFromOpenApi3(UUID projectId, JsonNode rootNode) {
        List<Endpoint> endpoints = new ArrayList<>();
        JsonNode pathsNode = rootNode.get("paths");
        if (pathsNode == null) return endpoints;

        Iterator<String> pathIterator = pathsNode.fieldNames();
        while (pathIterator.hasNext()) {
            String path = pathIterator.next();
            JsonNode pathItem = pathsNode.get(path);
            Iterator<String> methodIterator = pathItem.fieldNames();
            while (methodIterator.hasNext()) {
                String methodStr = methodIterator.next();
                if (!isHttpMethod(methodStr)) continue;

                JsonNode operation = pathItem.get(methodStr);

                Endpoint endpoint = Endpoint.builder()
                        .projectId(projectId)
                        .method(parseHttpMethod(methodStr))
                        .path(path)
                        .description(extractText(operation, "summary", "description"))
                        .discoveryType(Endpoint.DiscoveryType.SWAGGER)
                        .tags(extractTags(operation))
                        .parameters(extractParameters(operation.get("parameters"), rootNode))
                        .requestBody(extractRequestBody(operation, rootNode))
                        .responseBody(extractResponses(operation, rootNode))
                        .statusCodes(extractStatusCodes(operation))
                        .requiresAuth(checkIfRequiresAuth(operation))
                        .build();

                endpoints.add(endpoint);
                log.debug("📍 Endpoint OpenAPI3 trouvé : {} {}", methodStr.toUpperCase(), path);
            }
        }
        return endpoints;
    }

    // ========================= Swagger 2 =========================
    private List<Endpoint> extractEndpointsFromSwagger2(UUID projectId, JsonNode rootNode) {
        List<Endpoint> endpoints = new ArrayList<>();
        JsonNode pathsNode = rootNode.get("paths");
        if (pathsNode == null) return endpoints;

        Iterator<String> pathIterator = pathsNode.fieldNames();
        while (pathIterator.hasNext()) {
            String path = pathIterator.next();
            JsonNode pathItem = pathsNode.get(path);
            Iterator<String> methodIterator = pathItem.fieldNames();
            while (methodIterator.hasNext()) {
                String methodStr = methodIterator.next();
                if (!isHttpMethod(methodStr)) continue;

                JsonNode operation = pathItem.get(methodStr);

                // Traitement spécifique Swagger 2 : extraire le paramètre body et le convertir en requestBody
                String requestBodyJson = null;
                ArrayNode filteredParams = objectMapper.createArrayNode();
                JsonNode parametersNode = operation.get("parameters");
                if (parametersNode != null && parametersNode.isArray()) {
                    for (JsonNode param : parametersNode) {
                        if (param.has("in") && "body".equals(param.get("in").asText())) {
                            // Construire le requestBody à partir de ce paramètre
                            requestBodyJson = buildRequestBodyFromBodyParam(param, rootNode);
                        } else {
                            filteredParams.add(param);
                        }
                    }
                }

                String parametersJson = extractParameters(filteredParams, rootNode);

                Endpoint endpoint = Endpoint.builder()
                        .projectId(projectId)
                        .method(parseHttpMethod(methodStr))
                        .path(path)
                        .description(extractText(operation, "summary", "description"))
                        .discoveryType(Endpoint.DiscoveryType.SWAGGER)
                        .tags(extractTags(operation))
                        .parameters(parametersJson)
                        .requestBody(requestBodyJson)
                        .responseBody(extractResponses(operation, rootNode))
                        .statusCodes(extractStatusCodes(operation))
                        .requiresAuth(checkIfRequiresAuth(operation))
                        .build();

                endpoints.add(endpoint);
                log.debug("📍 Endpoint Swagger2 trouvé : {} {}", methodStr.toUpperCase(), path);
            }
        }
        return endpoints;
    }

    /**
     * Construit un objet requestBody standardisé (comme en OpenAPI 3) à partir d'un paramètre body Swagger 2.
     */
    private String buildRequestBodyFromBodyParam(JsonNode bodyParam, JsonNode rootNode) {
        JsonNode schema = bodyParam.get("schema");
        if (schema != null) {
            JsonNode resolvedSchema = resolveRefs(schema, rootNode);
            ObjectNode requestBodyNode = objectMapper.createObjectNode();
            ObjectNode contentNode = objectMapper.createObjectNode();
            ObjectNode mediaTypeNode = objectMapper.createObjectNode();
            mediaTypeNode.set("schema", resolvedSchema);
            contentNode.set("application/json", mediaTypeNode);
            requestBodyNode.set("content", contentNode);
            boolean required = bodyParam.has("required") && bodyParam.get("required").asBoolean();
            requestBodyNode.put("required", required);
            try {
                return objectMapper.writeValueAsString(requestBodyNode);
            } catch (Exception e) {
                log.warn("Erreur lors de la sérialisation du requestBody : {}", e.getMessage());
            }
        }
        return null;
    }

    // ========================= Sauvegarde =========================
    private ScanSwaggerResponse saveEndpoints(UUID projectId, List<Endpoint> endpoints) {
        int newCount = 0;
        int updatedCount = 0;
        int skippedCount = 0;
        List<EndpointDTO> savedEndpoints = new ArrayList<>();

        for (Endpoint endpoint : endpoints) {
            boolean exists = endpointRepository.existsByProjectIdAndMethodAndPath(
                    projectId, endpoint.getMethod(), endpoint.getPath()
            );

            if (exists) {
                skippedCount++;
                log.debug("⏭️ Endpoint ignoré (déjà existant) : {} {}", endpoint.getMethod(), endpoint.getPath());
            } else {
                Endpoint saved = endpointRepository.save(endpoint);
                newCount++;
                savedEndpoints.add(convertToDTO(saved));
                log.debug("✅ Endpoint créé : {} {}", saved.getMethod(), saved.getPath());
            }
        }

        return new ScanSwaggerResponse(
                true,
                "Scan terminé avec succès",
                endpoints.size(),
                newCount,
                updatedCount,
                skippedCount,
                savedEndpoints
        );
    }

    // ========================= Résolution des références =========================
    private JsonNode resolveRefs(JsonNode node, JsonNode rootNode) {
        if (node == null || node.isNull()) return null;

        if (node.isObject() && node.has("$ref")) {
            String ref = node.get("$ref").asText();
            if (ref.startsWith("#/")) {
                String[] parts = ref.substring(2).split("/");
                JsonNode target = rootNode;
                for (String part : parts) {
                    target = target.get(part);
                    if (target == null) {
                        log.warn("Référence introuvable : {}", ref);
                        return node;
                    }
                }
                return resolveRefs(target, rootNode);
            }
            return node;
        }

        if (node.isObject()) {
            ObjectNode newNode = objectMapper.createObjectNode();
            node.fields().forEachRemaining(entry ->
                    newNode.set(entry.getKey(), resolveRefs(entry.getValue(), rootNode))
            );
            return newNode;
        }

        if (node.isArray()) {
            ArrayNode newArray = objectMapper.createArrayNode();
            node.forEach(item -> newArray.add(resolveRefs(item, rootNode)));
            return newArray;
        }

        return node;
    }

    // ========================= Méthodes d'extraction =========================
    private String extractParameters(JsonNode parametersNode, JsonNode rootNode) {
        if (parametersNode != null && !parametersNode.isNull()) {
            JsonNode resolved = resolveRefs(parametersNode, rootNode);
            try {
                return objectMapper.writeValueAsString(resolved);
            } catch (Exception e) {
                log.warn("Erreur lors de l'extraction des paramètres : {}", e.getMessage());
            }
        }
        return null;
    }

    private String extractRequestBody(JsonNode operation, JsonNode rootNode) {
        if (operation.has("requestBody")) {
            JsonNode requestBody = operation.get("requestBody");
            JsonNode resolved = resolveRefs(requestBody, rootNode);
            try {
                return objectMapper.writeValueAsString(resolved);
            } catch (Exception e) {
                log.warn("Erreur lors de l'extraction du requestBody : {}", e.getMessage());
            }
        }
        return null;
    }

    private String extractResponses(JsonNode operation, JsonNode rootNode) {
        if (operation.has("responses")) {
            JsonNode responses = operation.get("responses");
            JsonNode successResponse = responses.has("200") ? responses.get("200") :
                    responses.has("201") ? responses.get("201") : null;
            if (successResponse != null) {
                JsonNode resolved = resolveRefs(successResponse, rootNode);
                try {
                    return objectMapper.writeValueAsString(resolved);
                } catch (Exception e) {
                    log.warn("Erreur lors de l'extraction des réponses : {}", e.getMessage());
                }
            }
        }
        return null;
    }

    private String extractStatusCodes(JsonNode operation) {
        if (operation.has("responses")) {
            StringBuilder codes = new StringBuilder();
            Iterator<String> codeIterator = operation.get("responses").fieldNames();
            while (codeIterator.hasNext()) {
                String code = codeIterator.next();
                if (codes.length() > 0) codes.append(",");
                codes.append(code);
            }
            return codes.toString();
        }
        return "200";
    }

    // ========================= Utilitaires =========================
    private boolean isHttpMethod(String method) {
        return method.equalsIgnoreCase("get") || method.equalsIgnoreCase("post") ||
                method.equalsIgnoreCase("put") || method.equalsIgnoreCase("delete") ||
                method.equalsIgnoreCase("patch") || method.equalsIgnoreCase("options") ||
                method.equalsIgnoreCase("head");
    }

    private Endpoint.HttpMethod parseHttpMethod(String method) {
        return Endpoint.HttpMethod.valueOf(method.toUpperCase());
    }

    private String extractText(JsonNode node, String... fields) {
        for (String field : fields) {
            if (node.has(field)) {
                return node.get(field).asText();
            }
        }
        return null;
    }

    private String extractTags(JsonNode operation) {
        if (operation.has("tags") && operation.get("tags").isArray()) {
            StringBuilder tags = new StringBuilder();
            operation.get("tags").forEach(tag -> {
                if (tags.length() > 0) tags.append(", ");
                tags.append(tag.asText());
            });
            return tags.toString();
        }
        return null;
    }

    private Boolean checkIfRequiresAuth(JsonNode operation) {
        return operation.has("security") && operation.get("security").size() > 0;
    }

    private EndpointDTO convertToDTO(Endpoint endpoint) {
        return EndpointDTO.builder()
                .id(endpoint.getId())
                .projectId(endpoint.getProjectId())
                .method(endpoint.getMethod())
                .path(endpoint.getPath())
                .description(endpoint.getDescription())
                .discoveryType(endpoint.getDiscoveryType())
                .tags(endpoint.getTags())
                .parameters(endpoint.getParameters())
                .requestBody(endpoint.getRequestBody())
                .responseBody(endpoint.getResponseBody())
                .statusCodes(endpoint.getStatusCodes())
                .requiresAuth(endpoint.getRequiresAuth())
                .createdAt(endpoint.getCreatedAt())
                .updatedAt(endpoint.getUpdatedAt())
                .build();
    }

    private ScanSwaggerResponse createErrorResponse(String message) {
        return new ScanSwaggerResponse(false, message, 0, 0, 0, 0, new ArrayList<>());
    }
}