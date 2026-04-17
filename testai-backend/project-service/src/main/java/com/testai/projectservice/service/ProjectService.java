package com.testai.projectservice.service;

import com.testai.projectservice.dto.*;
import com.testai.projectservice.entity.ApiCredentials;
import com.testai.projectservice.entity.Project;
import com.testai.projectservice.exception.UserNotFoundException;
import com.testai.projectservice.feignclient.EndpointServiceClient;
import com.testai.projectservice.feignclient.ExecutionServiceClient;
import com.testai.projectservice.feignclient.TestServiceClient;
import com.testai.projectservice.feignclient.UserServiceClient;
import com.testai.projectservice.repository.ApiCredentialsRepository;
import com.testai.projectservice.repository.ProjectRepository;
import com.testai.projectservice.repository.SharedAccessRepository;
import feign.FeignException;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
public class ProjectService {

    @Autowired
    private ProjectRepository projectRepository;
    @Autowired
    private FileStorageService fileStorageService;
    @Autowired
    private UserServiceClient userClient;
    @Autowired
    private EndpointServiceClient endpointServiceClient;  // ⭐️ Feign Client pour endpoint-service
    @Autowired
    private ApiCredentialsRepository credentialsRepository;
    @Autowired
    private TestServiceClient testServiceClient;
    @Autowired
    private SharedAccessRepository sharedAccessRepository;
    @Autowired
    private ExecutionServiceClient executionServiceClient;

    @Transactional
    public Project createProject(ProjectDTO request) {
        // ÉTAPE 1 : Vérifier que l'utilisateur existe via Feign
        log.info("🔍 Vérification de l'utilisateur avec ID : {}", request.getUserId());

        try {
            UserDTO user = userClient.getUserById(request.getUserId());
            log.info("✅ Utilisateur trouvé : {} ({})", user.getName(), user.getEmail());

            if (user.getIsActive() == null || !user.getIsActive()) {
                throw new RuntimeException("L'utilisateur n'est pas actif");
            }

        } catch (FeignException.NotFound e) {
            log.error("❌ Utilisateur non trouvé : {}", request.getUserId());
            throw new UserNotFoundException(request.getUserId().toString());

        } catch (FeignException e) {
            log.error("❌ Erreur lors de la communication avec user-service : {}", e.getMessage());
            throw new RuntimeException("Impossible de vérifier l'utilisateur. User-service indisponible.");
        }

        // ÉTAPE 2 : Gérer la documentation (URL ou fichier)
        String docPath = "";
        if(request.getDocSubmitMode().equals("url")) {
            docPath = request.getDocUrl();
        } else {
            docPath = fileStorageService.store(request.getDocFile(), request.getName());
        }

        // ÉTAPE 3 : Créer le projet
        Project project = new Project();
        project.setName(request.getName());
        project.setDescription(request.getDescription());
        project.setProjectUrl(request.getProjectUrl());
        project.setAuthType(request.getAuthType());
        project.setDocUrl(docPath);
        project.setUserId(request.getUserId());
        project.setDocMode(request.getDocMode());

        Project savedProject = projectRepository.save(project);
        log.info("✅ Projet créé avec succès : {} (ID: {})", savedProject.getName(), savedProject.getId());
// 2.2. Créer les credentials si nécessaire
        if (request.getAuthType() != Project.AuthType.NONE) {
            ApiCredentials credentials = ApiCredentials.builder()
                    .project(project)
                    .build();

            switch (request.getAuthType()) {
                case BASIC:
                    credentials.setBasicUsername(request.getAuthUsername());
                    credentials.setBasicPassword(request.getAuthPassword());
                    break;
                case APIKEY:
                    credentials.setApiKey(request.getApiKey());
                    credentials.setApiKeyHeader(request.getApiKeyHeader());
                    credentials.setApiKeyLocation(request.getApiKeyLocation());
                    break;
                case BEARER:
                    credentials.setBearerToken(request.getBearerToken());
                    break;
            }

            credentialsRepository.save(credentials);
            project.setCredentials(credentials);
        }
        log.info("✅ Credentials de projet cree avec succes", savedProject.getName(), savedProject.getId());

        // ⭐️ ÉTAPE 4 : Si DocMode = SWAGGER, scanner automatiquement les endpoints
        if (request.getDocMode() == Project.DocsMode.SWAGGER && request.getDocSubmitMode().equals("url")) {
            log.info("🔍 Scan automatique des endpoints Swagger...");
            scanProjectEndpoints(savedProject);
        }

        return savedProject;
    }
    /**
     * ⭐️ Scanner automatiquement les endpoints d'un projet via endpoint-service
     */
    private void scanProjectEndpoints(Project project) {
        try {
            ScanSwaggerRequest scanRequest = new ScanSwaggerRequest(
                    project.getId(),
                    project.getDocUrl()
            );

            ScanSwaggerResponse response = endpointServiceClient.scanSwagger(scanRequest);

            if (response.isSuccess()) {
                log.info("✅ Scan Swagger réussi : {} endpoints découverts ({} nouveaux)",
                        response.getTotalEndpoints(), response.getNewEndpoints());
            } else {
                log.warn("⚠️ Échec du scan Swagger : {}", response.getMessage());
            }

        } catch (FeignException e) {
            log.error("❌ Erreur lors du scan Swagger : {}", e.getMessage());
            // Ne pas bloquer la création du projet si le scan échoue
        }
    }

    /**
     * ⭐️ NOUVEAU : Scanner manuellement les endpoints d'un projet
     */
    @Transactional
    public ScanSwaggerResponse scanEndpoints(UUID projectId) {
        log.info("🔍 Scan manuel des endpoints pour le projet {}", projectId);

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Projet non trouvé"));

        if (project.getDocMode() != Project.DocsMode.SWAGGER) {
            throw new RuntimeException("Le projet n'utilise pas Swagger");
        }

        try {
            ScanSwaggerRequest scanRequest = new ScanSwaggerRequest(
                    project.getId(),
                    project.getDocUrl()
            );

            ScanSwaggerResponse response = endpointServiceClient.scanSwagger(scanRequest);
            log.info("✅ Scan terminé : {} endpoints", response.getTotalEndpoints());
            return response;

        } catch (FeignException e) {
            log.error("❌ Erreur lors du scan : {}", e.getMessage());
            throw new RuntimeException("Erreur lors du scan Swagger : " + e.getMessage());
        }
    }

    /**
     * ⭐️ NOUVEAU : Récupérer les endpoints d'un projet
     */
    public List<EndpointDTO> getProjectEndpoints(UUID projectId) {
        log.info("📋 Récupération des endpoints du projet {}", projectId);

        // Vérifier que le projet existe
        if (!projectRepository.existsById(projectId)) {
            throw new RuntimeException("Projet non trouvé");
        }

        try {
            return endpointServiceClient.getEndpointsByProjectId(projectId);
        } catch (FeignException e) {
            log.error("❌ Erreur lors de la récupération des endpoints : {}", e.getMessage());
            throw new RuntimeException("Impossible de récupérer les endpoints : " + e.getMessage());
        }
    }

    /**
     * ⭐️ NOUVEAU : Compter les endpoints d'un projet
     */
    public Map<String, Object> countProjectEndpoints(UUID projectId) {
        log.info("🔢 Comptage des endpoints du projet {}", projectId);

        if (!projectRepository.existsById(projectId)) {
            throw new RuntimeException("Projet non trouvé");
        }

        try {
            return endpointServiceClient.countEndpointsByProjectId(projectId);
        } catch (FeignException e) {
            log.error("❌ Erreur lors du comptage : {}", e.getMessage());
            throw new RuntimeException("Impossible de compter les endpoints : " + e.getMessage());
        }
    }

    public Project getProjectById(UUID projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Projet non trouvé"));
    }

    public List<Project> getAllProjects() {
        return projectRepository.findAll();
    }

    public List<Project> getProjectsByUserId(UUID userId) {
        try {
            userClient.getUserById(userId);
        } catch (FeignException.NotFound e) {
            throw new UserNotFoundException(userId.toString());
        }

        return projectRepository.findAll().stream()
                .filter(p -> p.getUserId().equals(userId))
                .toList();
    }

    public List<Project> getProjectsByAuthType(Project.AuthType authType) {
        return projectRepository.findByAuthType(authType);
    }

    public List<Project> getProjectsByDocMode(Project.DocsMode docMode) {
        return projectRepository.findByDocMode(docMode);
    }

    @Transactional
    public String deleteProjectById(UUID projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Projet non trouvé"));

        String docUrl = project.getDocUrl();
        try {
            // ⭐️ Supprimer d'abord les endpoints associés
            log.info("🗑️ Suppression des endpoints du projet {}", projectId);
            try {
                endpointServiceClient.deleteEndpointsByProjectId(projectId);
                log.info("✅ Endpoints supprimés avec succès");
            } catch (FeignException e) {
                log.warn("⚠️ Impossible de supprimer les endpoints : {}", e.getMessage());
                // Continuer même si la suppression échoue
            }

            // Supprimer le fichier de documentation si local
            if(!docUrl.startsWith("http")){
                fileStorageService.delete(docUrl);
            }

            // Supprimer le projet
            projectRepository.delete(project);
            log.info("✅ Projet supprimé : {}", projectId);
            return "Project with id '" + projectId + "' deleted successfully";

        } catch(Exception e) {
            log.error("❌ Erreur lors de la suppression du projet : {}", e.getMessage());
            return "Failed to delete project: " + e.getMessage();
        }
    }
    /**
     * ⭐ Mettre à jour un projet
     */
    @Transactional
    public Project updateProject(UUID projectId, UpdateProjectRequest request) {
        log.info("✏️ Mise à jour du projet {}", projectId);

        // 1. Récupérer le projet
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Projet non trouvé"));

        // 2. Mettre à jour les champs basiques
        if (request.getName() != null && !request.getName().isBlank()) {
            project.setName(request.getName());
        }

        if (request.getDescription() != null) {
            project.setDescription(request.getDescription());
        }

        if (request.getProjectUrl() != null && !request.getProjectUrl().isBlank()) {
            project.setProjectUrl(request.getProjectUrl());
        }

        if (request.getDocUrl() != null && !request.getDocUrl().isBlank()) {
            project.setDocUrl(request.getDocUrl());
        }

        // 3. Gérer le changement d'authType
        if (request.getAuthType() != null && request.getAuthType() != project.getAuthType()) {
            log.info("🔐 Changement d'authType : {} → {}", project.getAuthType(), request.getAuthType());
            project.setAuthType(request.getAuthType());

            // Supprimer les anciennes credentials si elles existent
            if (project.getCredentials() != null) {
                credentialsRepository.delete(project.getCredentials());
                project.setCredentials(null);
            }

            // Créer les nouvelles credentials si nécessaire
            if (request.getAuthType() != Project.AuthType.NONE) {
                createOrUpdateCredentials(project, request);
            }
        }
        // 4. Mettre à jour les credentials existants si authType inchangé
        else if (project.getAuthType() != Project.AuthType.NONE) {
            createOrUpdateCredentials(project, request);
        }

        // 5. Sauvegarder
        Project updated = projectRepository.save(project);
        log.info("✅ Projet mis à jour avec succès");

        return updated;
    }

    /**
     * Créer ou mettre à jour les credentials
     */
    private void createOrUpdateCredentials(Project project, UpdateProjectRequest request) {
        ApiCredentials credentials = project.getCredentials();

        // Créer si n'existe pas
        if (credentials == null) {
            credentials = ApiCredentials.builder()
                    .project(project)
                    .build();
        }

        // Réinitialiser tous les champs
        credentials.setBasicUsername(null);
        credentials.setBasicPassword(null);
        credentials.setApiKey(null);
        credentials.setApiKeyHeader(null);
        credentials.setApiKeyLocation(null);
        credentials.setBearerToken(null);

        // Remplir selon le type
        switch (project.getAuthType()) {
            case BASIC:
                if (request.getAuthUsername() == null || request.getAuthPassword() == null) {
                    throw new RuntimeException("Username et password requis pour BASIC auth");
                }
                credentials.setBasicUsername(request.getAuthUsername());
                credentials.setBasicPassword(request.getAuthPassword());
                log.info("🔐 Credentials BASIC configurés");
                break;

            case APIKEY:
                if (request.getApiKey() == null || request.getApiKeyHeader() == null) {
                    throw new RuntimeException("API Key et header requis pour APIKEY auth");
                }
                credentials.setApiKey(request.getApiKey());
                credentials.setApiKeyHeader(request.getApiKeyHeader());
                credentials.setApiKeyLocation(
                        request.getApiKeyLocation() != null
                                ? ApiCredentials.ApiKeyLocation.valueOf(request.getApiKeyLocation())
                                : ApiCredentials.ApiKeyLocation.HEADER
                );
                log.info("🔐 Credentials APIKEY configurés");
                break;

            case BEARER:
                if (request.getBearerToken() == null) {
                    throw new RuntimeException("Bearer token requis pour BEARER auth");
                }
                credentials.setBearerToken(request.getBearerToken());
                log.info("🔐 Credentials BEARER configurés");
                break;
        }

        credentialsRepository.save(credentials);
        project.setCredentials(credentials);
    }

    // ==========================================
    // DELETE PROJECT CASCADE
    // ==========================================

    /**
     * ⭐ Supprimer un projet et TOUT ce qui est lié
     *
     * Ordre de suppression :
     * 1. Exécutions (ProjectExecution + TestExecution)
     * 2. Tests générés
     * 3. Endpoints scannés
     * 4. Partages (SharedAccess)
     * 5. Credentials
     * 6. Fichier documentation (si local)
     * 7. Projet
     */
    @Transactional
    public String deleteProjectCascade(UUID projectId) {
        log.info("🗑️ Suppression en cascade du projet {}", projectId);

        // Vérifier que le projet existe
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Projet non trouvé"));

        int deletedExecutions = 0;
        int deletedTests = 0;
        int deletedEndpoints = 0;
        int deletedShares = 0;

        // ==========================================
        // ÉTAPE 1 : Supprimer les exécutions
        // ==========================================
        log.info("🗑️ [1/7] Suppression des exécutions...");
        try {
            executionServiceClient.deleteExecutionsByProjectId(projectId);
            deletedExecutions = 1; // On ne connaît pas le nombre exact
            log.info("✅ Exécutions supprimées");
        } catch (FeignException e) {
            log.warn("⚠️ Impossible de supprimer les exécutions : {}", e.getMessage());
            // Continuer même si échec
        }

        // ==========================================
        // ÉTAPE 2 : Supprimer les tests générés
        // ==========================================
        log.info("🗑️ [2/7] Suppression des tests générés...");
        try {
            testServiceClient.deleteTestsByProjectId(projectId);
            deletedTests = 1;
            log.info("✅ Tests supprimés");
        } catch (FeignException e) {
            log.warn("⚠️ Impossible de supprimer les tests : {}", e.getMessage());
        }

        // ==========================================
        // ÉTAPE 3 : Supprimer les endpoints
        // ==========================================
        log.info("🗑️ [3/7] Suppression des endpoints...");
        try {
            endpointServiceClient.deleteEndpointsByProjectId(projectId);
            deletedEndpoints = 1;
            log.info("✅ Endpoints supprimés");
        } catch (FeignException e) {
            log.warn("⚠️ Impossible de supprimer les endpoints : {}", e.getMessage());
        }

        // ==========================================
        // ÉTAPE 4 : Supprimer les partages
        // ==========================================
        log.info("🗑️ [4/7] Suppression des partages...");
        try {
            deletedShares = sharedAccessRepository.deleteByProjectId(projectId);
            log.info("✅ {} partages supprimés", deletedShares);
        } catch (Exception e) {
            log.warn("⚠️ Impossible de supprimer les partages : {}", e.getMessage());
        }

        // ==========================================
        // ÉTAPE 5 : Supprimer les credentials
        // ==========================================
        log.info("🗑️ [5/7] Suppression des credentials...");
        if (project.getCredentials() != null) {
            try {
                credentialsRepository.delete(project.getCredentials());
                log.info("✅ Credentials supprimés");
            } catch (Exception e) {
                log.warn("⚠️ Impossible de supprimer les credentials : {}", e.getMessage());
            }
        }

        // ==========================================
        // ÉTAPE 6 : Supprimer le fichier documentation
        // ==========================================
        log.info("🗑️ [6/7] Suppression du fichier documentation...");
        String docUrl = project.getDocUrl();
        if (docUrl != null && !docUrl.startsWith("http")) {
            // C'est un fichier local
            try {
                fileStorageService.delete(docUrl);
                log.info("✅ Fichier documentation supprimé");
            } catch (Exception e) {
                log.warn("⚠️ Impossible de supprimer le fichier : {}", e.getMessage());
            }
        }

        // ==========================================
        // ÉTAPE 7 : Supprimer le projet
        // ==========================================
        log.info("🗑️ [7/7] Suppression du projet...");
        projectRepository.delete(project);
        log.info("✅ Projet supprimé");

        // ==========================================
        // RÉSUMÉ
        // ==========================================
        String summary = String.format(
                "Projet '%s' supprimé avec succès ! " +
                        "Supprimé : %d exécution(s), %d test(s), %d endpoint(s), %d partage(s)",
                project.getName(),
                deletedExecutions > 0 ? 1 : 0,
                deletedTests > 0 ? 1 : 0,
                deletedEndpoints > 0 ? 1 : 0,
                deletedShares
        );

        log.info("🎉 " + summary);
        return summary;
    }
    // ==========================================
// ACTIVATION / DÉSACTIVATION
// ==========================================

    /**
     * ⭐ Activer un projet
     */
    @Transactional
    public Project activateProject(UUID projectId, UUID userId) {
        log.info("✅ Activation du projet {}", projectId);

        // 1. Récupérer le projet
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Projet non trouvé"));

        // 2. Vérifier que l'utilisateur est le propriétaire
        if (!project.getUserId().equals(userId)) {
            throw new RuntimeException("Seul le propriétaire peut activer/désactiver le projet");
        }

        // 3. Vérifier si déjà actif
        if (Boolean.TRUE.equals(project.getIsActive())) {
            log.info("⚠️ Le projet est déjà actif");
            return project;
        }

        // 4. Activer
        project.setIsActive(true);
        project.setActivatedAt(LocalDateTime.now());
        project.setDeactivatedAt(null);

        Project activated = projectRepository.save(project);
        log.info("✅ Projet activé avec succès");

        return activated;
    }

    /**
     * ⭐ Désactiver un projet
     */
    @Transactional
    public Project deactivateProject(UUID projectId, UUID userId) {
        log.info("🔒 Désactivation du projet {}", projectId);

        // 1. Récupérer le projet
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Projet non trouvé"));

        // 2. Vérifier que l'utilisateur est le propriétaire
        if (!project.getUserId().equals(userId)) {
            throw new RuntimeException("Seul le propriétaire peut activer/désactiver le projet");
        }

        // 3. Vérifier si déjà désactivé
        if (Boolean.FALSE.equals(project.getIsActive())) {
            log.info("⚠️ Le projet est déjà désactivé");
            return project;
        }

        // 4. Désactiver
        project.setIsActive(false);
        project.setDeactivatedAt(LocalDateTime.now());

        Project deactivated = projectRepository.save(project);
        log.info("🔒 Projet désactivé avec succès");

        return deactivated;
    }

    /**
     * ⭐ Toggle activation (activer si désactivé, désactiver si activé)
     */
    @Transactional
    public Project toggleProjectActivation(UUID projectId, UUID userId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Projet non trouvé"));

        if (!project.getUserId().equals(userId)) {
            throw new RuntimeException("Seul le propriétaire peut activer/désactiver le projet");
        }

        if (Boolean.TRUE.equals(project.getIsActive())) {
            return deactivateProject(projectId, userId);
        } else {
            return activateProject(projectId, userId);
        }
    }
    
    public List<UUID> getUserProjects(UUID userId){
        try{
            return projectRepository.findUserProjects(userId);
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }
}