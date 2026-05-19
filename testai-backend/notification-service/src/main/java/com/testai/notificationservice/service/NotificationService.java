package com.testai.notificationservice.service;

import com.testai.notificationservice.dto.NotificationDTO;
import com.testai.notificationservice.dto.SendNotificationRequest;
import com.testai.notificationservice.entity.Notification;
import com.testai.notificationservice.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate; // ⭐ Pour envoyer via WebSocket

    // ── Envoyer une notification ───────────────────────────────────────────
    public void sendNotification(SendNotificationRequest request) {
        // 1. Sauvegarder en DB
        Notification notification = Notification.builder()
                .recipientUserId(request.getRecipientUserId())
                .type(request.getType())
                .title(request.getTitle())
                .message(request.getMessage())
                .projectId(request.getProjectId())
                .metadata(request.getMetadata())
                .isRead(false)
                .build();

        notification = notificationRepository.save(notification);
        log.info("✅ Notification sauvegardée: {} → {}", request.getType(), request.getRecipientUserId());

        // 2. Envoyer en temps réel via WebSocket
        NotificationDTO dto = toDTO(notification);
        String destination = "/topic/notifications/" +  request.getRecipientUserId();
        messagingTemplate.convertAndSend(destination, dto);
        log.info("📡 Notification WebSocket envoyée vers: {}", destination);
    }

    // ── Récupérer toutes les notifications d'un user ───────────────────────
    public List<NotificationDTO> getNotifications(UUID userId) {
        return notificationRepository
                .findByRecipientUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    // ── Compter les non lues ───────────────────────────────────────────────
    public long countUnread(UUID userId) {
        return notificationRepository.countByRecipientUserIdAndIsReadFalse(userId);
    }

    // ── Marquer une notification comme lue ────────────────────────────────
    public void markAsRead(UUID notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.setIsRead(true);
            notificationRepository.save(n);
        });
    }

    // ── Marquer toutes comme lues ─────────────────────────────────────────
    public void markAllAsRead(UUID userId) {
        notificationRepository.markAllAsReadByUserId(userId);
    }

    // ── Mapper ────────────────────────────────────────────────────────────
    private NotificationDTO toDTO(Notification n) {
        return NotificationDTO.builder()
                .id(n.getId())
                .type(n.getType())
                .title(n.getTitle())
                .message(n.getMessage())
                .projectId(n.getProjectId())
                .isRead(n.getIsRead())
                .createdAt(n.getCreatedAt())
                .metadata(n.getMetadata())
                .build();
    }
}