package com.testai.projectservice.controller;

import com.testai.projectservice.dto.*;
import com.testai.projectservice.entity.Project;
import com.testai.projectservice.exception.UserNotFoundException;
import com.testai.projectservice.feignclient.UserServiceClient;
import com.testai.projectservice.service.ProjectService;
import com.testai.projectservice.service.SharedAccessService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
@Slf4j
public class ProjectController {

    @Autowired
    private ProjectService projectService;

    @Autowired
    private UserServiceClient userServiceClient;

    @Autowired
    private SharedAccessService sharedAccessService;   // ⭐ Ajout pour le partage

    // ========================================
    // ANCIENNES MÉTHODES (inchangées)
    // ========================================

    private boolean isInvalidLink(String url) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            return !response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            return true;
        }
    }

    @PostMapping(path = "/add", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> addProject(@ModelAttribute ProjectDTO request) {
        try {
            if (userServiceClient.getUserById(request.getUserId()) == null) {
                return ResponseEntity.badRequest().body("User does not exist");
            }
            /*
            if (isInvalidLink(request.getProjectUrl())) {
                return ResponseEntity.badRequest().body("Invalid Service URL !!");
            }
            if (request.getDocSubmitMode().equals("url") && isInvalidLink(request.getDocUrl())) {
                return ResponseEntity.badRequest().body("Invalid Documentation URL !!");
            }
            */


            Project newProject = projectService.createProject(request);
            return ResponseEntity.ok(newProject);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/all")
    public ResponseEntity<List<Project>> getAllProjects() {
        List<Project> projects = projectService.getAllProjects();
        return ResponseEntity.ok(projects);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Project> getProjectById(@PathVariable UUID id) {
        return ResponseEntity.ok(projectService.getProjectById(id));
    }

    @GetMapping("/auth_type/{authtype}")
    public ResponseEntity<List<Project>> getProjectsByAuthtype(@PathVariable Project.AuthType authtype) {
        return ResponseEntity.ok(projectService.getProjectsByAuthType(authtype));
    }

    @GetMapping("/doc_mode/{docMode}")
    public ResponseEntity<List<Project>> getProjectsByDocMode(@PathVariable Project.DocsMode docMode) {
        return ResponseEntity.ok(projectService.getProjectsByDocMode(docMode));
    }


    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Project>> getProjectsByUserId(@PathVariable UUID userId) {
        try {
            List<Project> projects = projectService.getProjectsByUserId(userId);
            return ResponseEntity.ok(projects);
        } catch (UserNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/{projectId}/scan-endpoints")
    public ResponseEntity<?> scanProjectEndpoints(@PathVariable UUID projectId) {
        log.info("🔍 Demande de scan des endpoints pour le projet {}", projectId);
        try {
            ScanSwaggerResponse response = projectService.scanEndpoints(projectId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("❌ Erreur lors du scan : {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    @GetMapping("/{projectId}/endpoints")
    public ResponseEntity<?> getProjectEndpoints(@PathVariable UUID projectId) {
        log.info("📋 Récupération des endpoints du projet {}", projectId);
        try {
            List<EndpointDTO> endpoints = projectService.getProjectEndpoints(projectId);
            return ResponseEntity.ok(endpoints);
        } catch (Exception e) {
            log.error("❌ Erreur : {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    @GetMapping("/{projectId}/endpoints/count")
    public ResponseEntity<?> countProjectEndpoints(@PathVariable UUID projectId) {
        log.info("🔢 Comptage des endpoints du projet {}", projectId);
        try {
            Map<String, Object> count = projectService.countProjectEndpoints(projectId);
            return ResponseEntity.ok(count);
        } catch (Exception e) {
            log.error("❌ Erreur : {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    // ========================================
    // NOUVELLES MÉTHODES - PARTAGE ⭐
    // ========================================

    /**
     * Partager un projet avec un développeur
     * Accessible uniquement par le MANAGER propriétaire
     */
    @PostMapping("/{projectId}/share")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<SharedAccessDTO> shareProject(
            @PathVariable UUID projectId,
            @RequestBody ShareProjectRequest request
    ) {
        SharedAccessDTO shared = sharedAccessService.shareProject(projectId, request);
        return ResponseEntity.ok(shared);
    }

    /**
     * Lister tous les partages d'un projet
     * Accessible par le MANAGER propriétaire
     */
    @GetMapping("/{projectId}/shares")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<List<SharedAccessDTO>> getProjectShares(
            @PathVariable UUID projectId,
            Authentication authentication
    ) {
        // Vérifier que c'est le propriétaire
        UUID userId = getUserIdFromAuth(authentication);
        Project project = projectService.getProjectById(projectId);
        if (!project.getUserId().equals(userId)) {
            return ResponseEntity.status(403).build();
        }
        List<SharedAccessDTO> shares = sharedAccessService.getProjectShares(projectId);
        return ResponseEntity.ok(shares);
    }

    /**
     * Révoquer un partage
     * Accessible par le MANAGER qui a partagé
     */
    @DeleteMapping("/shares/{sharedAccessId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<Void> revokeAccess(@PathVariable UUID sharedAccessId) {
        sharedAccessService.revokeAccess(sharedAccessId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Lister tous les projets partagés AVEC le développeur actuel
     * Accessible par DEVELOPER
     */
    @GetMapping("/shared-with-me")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<List<SharedProjectDTO>> getSharedProjects(Authentication authentication) {
        UUID userId = getUserIdFromAuth(authentication);
        List<SharedProjectDTO> shared = sharedAccessService.getSharedProjects(userId);
        return ResponseEntity.ok(shared);
    }
    @PutMapping("/shared-access/link")
    public ResponseEntity<Void> linkSharedAccessToUser(
            @RequestParam String email,
            @RequestParam UUID userId
    ) {
        sharedAccessService.linkPendingShares(email, userId);
        return ResponseEntity.ok().build();
    }
    @PutMapping("/shares/{sharedAccessId}/access-level")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<SharedAccessDTO> updateAccessLevel(
            @PathVariable UUID sharedAccessId,
            @RequestBody Map<String, String> request
    ) {
        String newAccessLevel = request.get("accessLevel");
        SharedAccessDTO updated = sharedAccessService.updateAccessLevel(sharedAccessId, newAccessLevel);
        return ResponseEntity.ok(updated);
    }
    /**
     * ⭐ Mettre à jour un projet
     * PUT /api/projects/{projectId}
     */
    @PutMapping("/{projectId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> updateProject(
            @PathVariable UUID projectId,
            @RequestBody UpdateProjectRequest request
    ) {
        log.info("✏️ Mise à jour du projet {}", projectId);
        try {
            Project updated = projectService.updateProject(projectId, request);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            log.error("❌ Erreur lors de la mise à jour : {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    /**
     * ⭐ Supprimer un projet en cascade
     * DELETE /api/projects/{projectId}
     *
     * Supprime :
     * - Les endpoints
     * - Les tests
     * - Les exécutions
     * - Les credentials
     * - Les partages
     * - Le projet
     */
    @DeleteMapping("/{projectId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> deleteProject(@PathVariable UUID projectId) {
        log.info("🗑️ Suppression du projet {}", projectId);
        try {
            String message = projectService.deleteProjectCascade(projectId);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", message
            ));
        } catch (Exception e) {
            log.error("❌ Erreur lors de la suppression : {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }


    // ========================================
    // HELPERS
    // ========================================

    private UUID getUserIdFromAuth(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        String email = jwt.getClaimAsString("email");
        String token = "Bearer " + jwt.getTokenValue();
        UserDTO user = userServiceClient.getUserByEmail(email, token);
        return user.getId();
    }
}