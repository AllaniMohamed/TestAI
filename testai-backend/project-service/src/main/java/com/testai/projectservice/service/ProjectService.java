package com.testai.projectservice.service;

import com.testai.projectservice.dto.ProjectDTO;
import com.testai.projectservice.dto.UserDTO;
import com.testai.projectservice.dto.EndpointDTO;
import com.testai.projectservice.dto.ScanSwaggerRequest;
import com.testai.projectservice.dto.ScanSwaggerResponse;
import com.testai.projectservice.entity.ApiCredentials;
import com.testai.projectservice.entity.Project;
import com.testai.projectservice.exception.UserNotFoundException;
import com.testai.projectservice.feignclient.EndpointServiceClient;
import com.testai.projectservice.feignclient.UserServiceClient;
import com.testai.projectservice.repository.ApiCredentialsRepository;
import com.testai.projectservice.repository.ProjectRepository;
import feign.FeignException;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

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
}