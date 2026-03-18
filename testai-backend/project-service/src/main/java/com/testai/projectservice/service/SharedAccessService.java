package com.testai.projectservice.service;

import com.testai.projectservice.feignclient.UserServiceClient;
import com.testai.projectservice.dto.*;
import com.testai.projectservice.entity.*;
import com.testai.projectservice.repository.ProjectRepository;
import com.testai.projectservice.repository.SharedAccessRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SharedAccessService {

    private final SharedAccessRepository sharedAccessRepository;
    private final ProjectRepository projectRepository;
    private final UserServiceClient userServiceClient;

    /**
     * Partager un projet avec un développeur
     * ⭐ NE NÉCESSITE PAS que le développeur existe en base
     */
    @Transactional
    public SharedAccessDTO shareProject(UUID projectId, ShareProjectRequest request) {
        // 1. Récupérer le projet
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        // 2. Vérifier que l'utilisateur actuel est le propriétaire du projet
        UUID currentUserId = getCurrentUserId();
        if (!project.getUserId().equals(currentUserId)) {
            throw new RuntimeException("Only project owner can share");
        }

        // 3. Vérifier qu'il n'y a pas déjà un partage actif pour CET EMAIL
        sharedAccessRepository.findByProjectIdAndDeveloperEmailAndStatus(
                projectId,
                request.getDeveloperEmail(),
                AccessStatus.ACTIVE
        ).ifPresent(sa -> {
            throw new RuntimeException("Project already shared with this email");
        });

        // 4. Récupérer les infos du manager (pour l'email et le nom)
        String token = getAuthToken();
        UserDTO manager = userServiceClient.getUserById(currentUserId, token);

        // 5. Créer SharedAccess SANS vérifier si le développeur existe
        SharedAccess sharedAccess = new SharedAccess();
        sharedAccess.setProjectId(projectId);
        sharedAccess.setDeveloperEmail(request.getDeveloperEmail());
        sharedAccess.setUserId(null);
        sharedAccess.setInvitationToken(UUID.randomUUID().toString());
        sharedAccess.setStatus(AccessStatus.PENDING);
        sharedAccess.setAccessLevel(
                "READ_WRITE".equals(request.getAccessLevel())
                        ? AccessLevel.READ_WRITE
                        : AccessLevel.READ_ONLY
        );
        sharedAccess.setSharedBy(currentUserId);
        sharedAccess.setSharedByEmail(manager.getEmail());  // ⭐ Stocker l'email du manager
        sharedAccess.setInvitedAt(LocalDateTime.now());

        sharedAccess = sharedAccessRepository.save(sharedAccess);

        // 6. Envoyer l'email d'invitation
        SendShareInvitationRequest emailRequest = new SendShareInvitationRequest(
                request.getDeveloperEmail(),
                request.getDeveloperEmail(),      // Nom temporaire
                manager.getName(),                // Nom du manager
                project.getName(),
                project.getDescription(),
                sharedAccess.getInvitationToken()
        );

        try {
            userServiceClient.sendShareInvitation(emailRequest, token);
            log.info("✅ Email d'invitation envoyé à {}", request.getDeveloperEmail());
        } catch (Exception e) {
            log.error("❌ Erreur lors de l'envoi de l'email : {}", e.getMessage());
            // On ne rollback pas
        }

        // 7. Retourner le DTO
        SharedAccessDTO dto = new SharedAccessDTO();
        dto.setId(sharedAccess.getId());
        dto.setProjectId(sharedAccess.getProjectId());
        dto.setUserId(null);
        dto.setUserEmail(sharedAccess.getDeveloperEmail());
        dto.setUserName(request.getDeveloperEmail());
        dto.setStatus(sharedAccess.getStatus());
        dto.setAccessLevel(sharedAccess.getAccessLevel());
        dto.setSharedBy(sharedAccess.getSharedBy());
        dto.setSharedByEmail(manager.getEmail());  // ⭐ À ajouter dans SharedAccessDTO si nécessaire
        dto.setSharedByName(manager.getName());
        dto.setInvitedAt(sharedAccess.getInvitedAt());
        dto.setCreatedAt(sharedAccess.getCreatedAt());

        return dto;
    }

    /**
     * Activer une invitation (accepter le partage)
     * ⭐ Retourne si le développeur a un compte ou non
     */
    @Transactional
    public ActivateInvitationResponse activateInvitation(String token) {
        // 1. Trouver le SharedAccess
        SharedAccess sharedAccess = sharedAccessRepository.findByInvitationToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid invitation token"));

        // 2. Vérifier le statut
        if (sharedAccess.getStatus() != AccessStatus.PENDING) {
            throw new RuntimeException("Invitation already processed");
        }

        // 3. Récupérer le projet
        Project project = projectRepository.findById(sharedAccess.getProjectId())
                .orElseThrow(() -> new RuntimeException("Project not found"));

        // 4. ⭐ Vérifier si un compte existe pour cet email
        String authToken = getAuthToken();
        UserDTO developer = null;
        boolean hasAccount = false;

        try {
            developer = userServiceClient.getUserByEmail(sharedAccess.getDeveloperEmail(), authToken);
            hasAccount = true;
            log.info("✅ Compte trouvé pour {}", sharedAccess.getDeveloperEmail());
        } catch (Exception e) {
            hasAccount = false;
            log.info("ℹ️ Aucun compte pour {} - redirection vers register", sharedAccess.getDeveloperEmail());
        }

        // 5. ⭐ Si le compte existe, lier le SharedAccess à l'userId
        if (hasAccount) {
            sharedAccess.setUserId(developer.getId());
        }
        // Sinon, userId reste NULL (sera rempli après création du compte)

        // 6. Activer l'accès
        sharedAccess.setStatus(AccessStatus.ACTIVE);
        sharedAccess.setActivatedAt(LocalDateTime.now());

        sharedAccess = sharedAccessRepository.save(sharedAccess);

        // 7. ⭐ Retourner la réponse avec hasAccount
        ActivateInvitationResponse response = new ActivateInvitationResponse();
        response.setHasAccount(hasAccount);
        response.setEmail(sharedAccess.getDeveloperEmail());
        response.setInvitationToken(token);
        response.setProjectName(project.getName());

        return response;
    }
    /**
     * Récupérer les informations d'une invitation
     */
    public InvitationInfoDTO getInvitationInfo(String token) {
        SharedAccess sharedAccess = sharedAccessRepository.findByInvitationToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid invitation token"));

        Project project = projectRepository.findById(sharedAccess.getProjectId())
                .orElseThrow(() -> new RuntimeException("Project not found"));

        String authToken = getAuthToken();
        UserDTO manager = userServiceClient.getUserById(sharedAccess.getSharedBy(), authToken);

        InvitationInfoDTO info = new InvitationInfoDTO();
        info.setProjectName(project.getName());
        info.setProjectDescription(project.getDescription());
        info.setManagerName(manager.getName());
        info.setDeveloperEmail(sharedAccess.getDeveloperEmail());
        info.setDeveloperName(sharedAccess.getDeveloperEmail());  // Temporaire
        info.setAccessLevel(sharedAccess.getAccessLevel().toString());
        info.setStatus(sharedAccess.getStatus().toString());
        info.setInvitedAt(sharedAccess.getInvitedAt());

        return info;
    }

    /**
     * Lister tous les partages d'un projet
     */
    public List<SharedAccessDTO> getProjectShares(UUID projectId) {
        List<SharedAccess> shares = sharedAccessRepository.findByProjectId(projectId);
        String authToken = getAuthToken();

        return shares.stream()
                .map(sa -> {
                    UserDTO manager = userServiceClient.getUserById(sa.getSharedBy(), authToken);

                    // ⭐ Le développeur peut ne pas encore exister
                    UserDTO developer = null;
                    if (sa.getUserId() != null) {
                        try {
                            developer = userServiceClient.getUserById(sa.getUserId(), authToken);
                        } catch (Exception e) {
                            log.warn("User {} not found", sa.getUserId());
                        }
                    }

                    SharedAccessDTO dto = new SharedAccessDTO();
                    dto.setId(sa.getId());
                    dto.setProjectId(sa.getProjectId());
                    dto.setUserId(sa.getUserId());
                    dto.setUserEmail(sa.getDeveloperEmail());
                    dto.setUserName(developer != null ? developer.getName() : sa.getDeveloperEmail());
                    dto.setStatus(sa.getStatus());
                    dto.setAccessLevel(sa.getAccessLevel());
                    dto.setSharedBy(sa.getSharedBy());
                    dto.setSharedByName(manager.getName());
                    dto.setInvitedAt(sa.getInvitedAt());
                    dto.setActivatedAt(sa.getActivatedAt());
                    dto.setCreatedAt(sa.getCreatedAt());

                    return dto;
                })
                .collect(Collectors.toList());
    }

    /**
     * Lister tous les projets partagés avec un développeur
     */
    public List<SharedProjectDTO> getSharedProjects(UUID userId) {
        List<SharedAccess> shares = sharedAccessRepository.findByUserIdAndStatus(
                userId, AccessStatus.ACTIVE
        );

        return shares.stream()
                .map(sa -> {
                    Project project = projectRepository.findById(sa.getProjectId())
                            .orElseThrow(() -> new RuntimeException("Project not found"));

                    SharedProjectDTO dto = new SharedProjectDTO();
                    dto.setProjectId(project.getId());
                    dto.setProjectName(project.getName());
                    dto.setProjectDescription(project.getDescription());
                    dto.setProjectUrl(project.getProjectUrl());
                    dto.setManagerEmail(sa.getSharedByEmail());  // ⭐ Email du manager stocké
                    dto.setAccessLevel(sa.getAccessLevel().toString());
                    dto.setSharedAt(sa.getInvitedAt());

                    return dto;
                })
                .collect(Collectors.toList());
    }

    /**
     * Révoquer un partage
     */
    @Transactional
    public void revokeAccess(UUID sharedAccessId) {
        SharedAccess sharedAccess = sharedAccessRepository.findById(sharedAccessId)
                .orElseThrow(() -> new RuntimeException("Shared access not found"));

        // Vérifier que l'utilisateur actuel est le propriétaire du partage
        UUID currentUserId = getCurrentUserId();
        if (!sharedAccess.getSharedBy().equals(currentUserId)) {
            throw new RuntimeException("Only the manager who shared can revoke");
        }

        sharedAccess.setStatus(AccessStatus.REVOKED);
        sharedAccess.setRevokedAt(LocalDateTime.now());

        sharedAccessRepository.save(sharedAccess);
    }

    /**
     * Vérifier si un utilisateur a accès à un projet
     */
    public boolean hasAccess(UUID projectId, UUID userId) {
        // Vérifier si c'est le propriétaire
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        if (project.getUserId().equals(userId)) {
            return true;
        }

        // Vérifier si c'est partagé
        return sharedAccessRepository.findByProjectIdAndUserIdAndStatus(
                projectId, userId, AccessStatus.ACTIVE
        ).isPresent();
    }
    @Transactional
    public void linkPendingShares(String email, UUID userId) {
        List<SharedAccess> pending = sharedAccessRepository
                .findByDeveloperEmailAndUserIdIsNull(email);

        pending.forEach(sa -> {
            sa.setUserId(userId);
            sharedAccessRepository.save(sa);
        });

        log.info("✅ {} SharedAccess liés pour {}", pending.size(), email);
    }

    /*update statut (manager) of developers in the shared service*/
    @Transactional
    public SharedAccessDTO updateAccessLevel(UUID sharedAccessId, String newAccessLevel) {
        SharedAccess sharedAccess = sharedAccessRepository.findById(sharedAccessId)
                .orElseThrow(() -> new RuntimeException("Shared access not found"));

        UUID currentUserId = getCurrentUserId();
        if (!sharedAccess.getSharedBy().equals(currentUserId)) {
            throw new RuntimeException("Only the manager who shared can update");
        }

        AccessLevel level = "READ_WRITE".equals(newAccessLevel) ? AccessLevel.READ_WRITE : AccessLevel.READ_ONLY;
        sharedAccess.setAccessLevel(level);
        sharedAccess = sharedAccessRepository.save(sharedAccess);

        String authToken = getAuthToken();
        UserDTO manager = userServiceClient.getUserById(sharedAccess.getSharedBy(), authToken);
        UserDTO developer = null;
        if (sharedAccess.getUserId() != null) {
            try {
                developer = userServiceClient.getUserById(sharedAccess.getUserId(), authToken);
            } catch (Exception e) {
                log.warn("User {} not found", sharedAccess.getUserId());
            }
        }

        SharedAccessDTO dto = new SharedAccessDTO();
        dto.setId(sharedAccess.getId());
        dto.setProjectId(sharedAccess.getProjectId());
        dto.setUserId(sharedAccess.getUserId());
        dto.setUserEmail(sharedAccess.getDeveloperEmail());
        dto.setUserName(developer != null ? developer.getName() : sharedAccess.getDeveloperEmail());
        dto.setStatus(sharedAccess.getStatus());
        dto.setAccessLevel(sharedAccess.getAccessLevel());
        dto.setSharedBy(sharedAccess.getSharedBy());
        dto.setSharedByName(manager.getName());
        dto.setInvitedAt(sharedAccess.getInvitedAt());
        dto.setActivatedAt(sharedAccess.getActivatedAt());
        dto.setCreatedAt(sharedAccess.getCreatedAt());

        return dto;
    }

    // ========================================
    // HELPERS
    // ========================================

    private UUID getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Jwt jwt = (Jwt) authentication.getPrincipal();
        String email = jwt.getClaimAsString("email");
        String token = getAuthToken();
        UserDTO user = userServiceClient.getUserByEmail(email, token);
        return user.getId();
    }

    private String getAuthToken() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Jwt jwt = (Jwt) authentication.getPrincipal();
        return "Bearer " + jwt.getTokenValue();
    }
}