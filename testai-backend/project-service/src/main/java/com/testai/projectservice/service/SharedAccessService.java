package com.testai.projectservice.service;

import com.testai.projectservice.feignclient.NotificationServiceClient;
import com.testai.projectservice.feignclient.NotificationServiceClient.NotificationRequest;
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
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SharedAccessService {

    private final SharedAccessRepository sharedAccessRepository;
    private final ProjectRepository projectRepository;
    private final UserServiceClient userServiceClient;
    private final NotificationServiceClient notificationServiceClient; // ⭐ NOUVEAU

    // ── Helper : envoyer notification sans bloquer ─────────────────────────
    private void sendNotificationSafe(NotificationRequest request) {
        try {
            notificationServiceClient.sendNotification(request);
        } catch (Exception e) {
            log.warn("⚠️ Notification non envoyée: {}", e.getMessage());
        }
    }

    @Transactional
    public SharedAccessDTO shareProject(UUID projectId, ShareProjectRequest request) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        UUID currentUserId = getCurrentUserId();
        if (!project.getUserId().equals(currentUserId)) {
            throw new RuntimeException("Only project owner can share");
        }

        sharedAccessRepository.findByProjectIdAndDeveloperEmailAndStatus(
                projectId, request.getDeveloperEmail(), AccessStatus.ACTIVE
        ).ifPresent(sa -> {
            throw new RuntimeException("Project already shared with this email");
        });

        String token = getAuthToken();
        UserDTO manager = userServiceClient.getUserById(currentUserId, token);

        SharedAccess sharedAccess = new SharedAccess();
        sharedAccess.setProjectId(projectId);
        sharedAccess.setDeveloperEmail(request.getDeveloperEmail());
        sharedAccess.setUserId(null);
        sharedAccess.setInvitationToken(UUID.randomUUID().toString());
        sharedAccess.setStatus(AccessStatus.PENDING);
        sharedAccess.setAccessLevel(
                "READ_WRITE".equals(request.getAccessLevel())
                        ? AccessLevel.READ_WRITE : AccessLevel.READ_ONLY
        );
        sharedAccess.setSharedBy(currentUserId);
        sharedAccess.setSharedByEmail(manager.getEmail());
        sharedAccess.setInvitedAt(LocalDateTime.now());
        sharedAccess = sharedAccessRepository.save(sharedAccess);

        // Email invitation
        SendShareInvitationRequest emailRequest = new SendShareInvitationRequest(
                request.getDeveloperEmail(),
                request.getDeveloperEmail(),
                manager.getName(),
                project.getName(),
                project.getDescription(),
                sharedAccess.getInvitationToken()
        );
        try {
            userServiceClient.sendShareInvitation(emailRequest, token);
        } catch (Exception e) {
            log.error("❌ Erreur email : {}", e.getMessage());
        }

        // ⭐ Notifier le developer s'il a déjà un compte
        try {
            UserDTO developer = userServiceClient.getUserByEmail(request.getDeveloperEmail(), token);
            sendNotificationSafe(new NotificationRequest(
                    developer.getId(),
                    "INVITATION_SENT",
                    "📨 Nouvelle invitation",
                    "Vous avez été invité au projet \"" + project.getName()
                            + "\" par " + manager.getName(),
                    projectId,
                    Map.of(
                            "accessLevel", request.getAccessLevel(),
                            "managerName", manager.getName(),
                            "projectName", project.getName()
                    )
            ));
        } catch (Exception e) {
            // Le developer n'a pas de compte → pas de notification WebSocket
            log.info("ℹ️ Developer sans compte, pas de notification WebSocket");
        }

        SharedAccessDTO dto = new SharedAccessDTO();
        dto.setId(sharedAccess.getId());
        dto.setProjectId(sharedAccess.getProjectId());
        dto.setUserId(null);
        dto.setUserEmail(sharedAccess.getDeveloperEmail());
        dto.setUserName(request.getDeveloperEmail());
        dto.setStatus(sharedAccess.getStatus());
        dto.setAccessLevel(sharedAccess.getAccessLevel());
        dto.setSharedBy(sharedAccess.getSharedBy());
        dto.setSharedByEmail(manager.getEmail());
        dto.setSharedByName(manager.getName());
        dto.setInvitedAt(sharedAccess.getInvitedAt());
        dto.setCreatedAt(sharedAccess.getCreatedAt());
        return dto;
    }

    @Transactional
    public ActivateInvitationResponse activateInvitation(String token) {
        SharedAccess sharedAccess = sharedAccessRepository.findByInvitationToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid invitation token"));

        if (sharedAccess.getStatus() != AccessStatus.PENDING) {
            throw new RuntimeException("Invitation already processed");
        }

        Project project = projectRepository.findById(sharedAccess.getProjectId())
                .orElseThrow(() -> new RuntimeException("Project not found"));

        String authToken = getAuthToken();
        UserDTO developer = null;
        boolean hasAccount = false;

        try {
            developer = userServiceClient.getUserByEmail(sharedAccess.getDeveloperEmail(), authToken);
            hasAccount = true;
        } catch (Exception e) {
            hasAccount = false;
        }

        if (hasAccount && developer != null) {
            sharedAccess.setUserId(developer.getId());
        }

        sharedAccess.setStatus(AccessStatus.ACTIVE);
        sharedAccess.setActivatedAt(LocalDateTime.now());
        sharedAccess = sharedAccessRepository.save(sharedAccess);

        // ⭐ Notifier le manager que le developer a accepté
        if (hasAccount && developer != null) {
            UserDTO finalDeveloper = developer;
            sendNotificationSafe(new NotificationRequest(
                    sharedAccess.getSharedBy(),
                    "INVITATION_ACCEPTED",
                    "🤝 Invitation acceptée",
                    finalDeveloper.getName() + " a accepté votre invitation sur \""
                            + project.getName() + "\"",
                    project.getId(),
                    Map.of(
                            "developerEmail", sharedAccess.getDeveloperEmail(),
                            "developerName", finalDeveloper.getName(),
                            "projectName", project.getName()
                    )
            ));
        } else {
            // Le developer n'a pas de compte — notifier le manager avec l'email
            sendNotificationSafe(new NotificationRequest(
                    sharedAccess.getSharedBy(),
                    "INVITATION_ACCEPTED",
                    "🤝 Invitation acceptée",
                    sharedAccess.getDeveloperEmail() + " a accepté votre invitation sur \""
                            + project.getName() + "\"",
                    project.getId(),
                    Map.of(
                            "developerEmail", sharedAccess.getDeveloperEmail(),
                            "projectName", project.getName()
                    )
            ));
        }

        ActivateInvitationResponse response = new ActivateInvitationResponse();
        response.setHasAccount(hasAccount);
        response.setEmail(sharedAccess.getDeveloperEmail());
        response.setInvitationToken(token);
        response.setProjectName(project.getName());
        return response;
    }

    @Transactional
    public void revokeAccess(UUID sharedAccessId) {
        SharedAccess sharedAccess = sharedAccessRepository.findById(sharedAccessId)
                .orElseThrow(() -> new RuntimeException("Shared access not found"));

        UUID currentUserId = getCurrentUserId();
        if (!sharedAccess.getSharedBy().equals(currentUserId)) {
            throw new RuntimeException("Only the manager who shared can revoke");
        }

        // Récupérer le nom du projet avant de révoquer
        String projectName = projectRepository.findById(sharedAccess.getProjectId())
                .map(p -> p.getName())
                .orElse("projet");

        sharedAccess.setStatus(AccessStatus.REVOKED);
        sharedAccess.setRevokedAt(LocalDateTime.now());
        sharedAccessRepository.save(sharedAccess);

        // ⭐ Notifier le developer que son accès est révoqué
        if (sharedAccess.getUserId() != null) {
            sendNotificationSafe(new NotificationRequest(
                    sharedAccess.getUserId(),
                    "ACCESS_REVOKED",
                    "🚫 Accès révoqué",
                    "Votre accès au projet \"" + projectName + "\" a été révoqué",
                    sharedAccess.getProjectId(),
                    Map.of("projectName", projectName)
            ));
        }
    }

    // ── Méthodes inchangées ────────────────────────────────────────────────

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
        info.setDeveloperName(sharedAccess.getDeveloperEmail());
        info.setAccessLevel(sharedAccess.getAccessLevel().toString());
        info.setStatus(sharedAccess.getStatus().toString());
        info.setInvitedAt(sharedAccess.getInvitedAt());
        return info;
    }

    public List<SharedAccessDTO> getProjectShares(UUID projectId) {
        List<SharedAccess> shares = sharedAccessRepository.findByProjectId(projectId);
        String authToken = getAuthToken();
        return shares.stream().map(sa -> {
            UserDTO manager = userServiceClient.getUserById(sa.getSharedBy(), authToken);
            UserDTO developer = null;
            if (sa.getUserId() != null) {
                try { developer = userServiceClient.getUserById(sa.getUserId(), authToken); }
                catch (Exception e) { log.warn("User {} not found", sa.getUserId()); }
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
        }).collect(Collectors.toList());
    }

    public List<SharedProjectDTO> getSharedProjects(UUID userId) {
        List<SharedAccess> shares = sharedAccessRepository.findByUserIdAndStatus(userId, AccessStatus.ACTIVE);
        return shares.stream().map(sa -> {
            Project project = projectRepository.findById(sa.getProjectId())
                    .orElseThrow(() -> new RuntimeException("Project not found"));
            if (Boolean.FALSE.equals(project.getIsActive())) return null;
            SharedProjectDTO dto = new SharedProjectDTO();
            dto.setProjectId(project.getId());
            dto.setProjectName(project.getName());
            dto.setProjectDescription(project.getDescription());
            dto.setProjectUrl(project.getProjectUrl());
            dto.setManagerEmail(sa.getSharedByEmail());
            dto.setAccessLevel(sa.getAccessLevel().toString());
            dto.setSharedAt(sa.getInvitedAt());
            return dto;
        }).filter(Objects::nonNull).collect(Collectors.toList());
    }

    @Transactional
    public SharedAccessDTO updateAccessLevel(UUID sharedAccessId, String newAccessLevel) {
        SharedAccess sharedAccess = sharedAccessRepository.findById(sharedAccessId)
                .orElseThrow(() -> new RuntimeException("Shared access not found"));
        UUID currentUserId = getCurrentUserId();
        if (!sharedAccess.getSharedBy().equals(currentUserId))
            throw new RuntimeException("Only the manager who shared can update");
        AccessLevel level = "READ_WRITE".equals(newAccessLevel) ? AccessLevel.READ_WRITE : AccessLevel.READ_ONLY;
        sharedAccess.setAccessLevel(level);
        sharedAccess = sharedAccessRepository.save(sharedAccess);
        String authToken = getAuthToken();
        UserDTO manager = userServiceClient.getUserById(sharedAccess.getSharedBy(), authToken);
        UserDTO developer = null;
        if (sharedAccess.getUserId() != null) {
            try { developer = userServiceClient.getUserById(sharedAccess.getUserId(), authToken); }
            catch (Exception e) { log.warn("User {} not found", sharedAccess.getUserId()); }
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

    @Transactional
    public void linkPendingShares(String email, UUID userId) {
        List<SharedAccess> pending = sharedAccessRepository.findByDeveloperEmailAndUserIdIsNull(email);
        pending.forEach(sa -> { sa.setUserId(userId); sharedAccessRepository.save(sa); });
        log.info("✅ {} SharedAccess liés pour {}", pending.size(), email);
    }

    public boolean hasAccess(UUID projectId, UUID userId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));
        if (project.getUserId().equals(userId)) return true;
        return sharedAccessRepository.findByProjectIdAndUserIdAndStatus(
                projectId, userId, AccessStatus.ACTIVE).isPresent();
    }

    public List<UUID> getUserProjects(UUID userId) {
        try { return sharedAccessRepository.findUserProjects(userId); }
        catch (Exception e) { return new ArrayList<>(); }
    }

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