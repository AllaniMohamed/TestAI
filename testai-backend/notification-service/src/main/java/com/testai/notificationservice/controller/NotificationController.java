package com.testai.notificationservice.controller;

import com.testai.notificationservice.dto.NotificationDTO;
import com.testai.notificationservice.dto.SendNotificationRequest;
import com.testai.notificationservice.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Slf4j
public class NotificationController {

    private final NotificationService notificationService;

    // ⭐ Endpoint interne — appelé par les autres microservices via Feign
    @PostMapping("/send")
    public ResponseEntity<Void> send(@RequestBody SendNotificationRequest request) {
        notificationService.sendNotification(request);
        return ResponseEntity.ok().build();
    }

    // Récupérer toutes les notifications d'un utilisateur
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<NotificationDTO>> getNotifications(@PathVariable UUID userId) {
        return ResponseEntity.ok(notificationService.getNotifications(userId));
    }

    // Compter les non lues
    @GetMapping("/user/{userId}/unread-count")
    public ResponseEntity<Map<String, Long>> countUnread(@PathVariable UUID userId) {
        return ResponseEntity.ok(Map.of("count", notificationService.countUnread(userId)));
    }

    // Marquer une notification comme lue
    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable UUID id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok().build();
    }

    // Marquer toutes comme lues
    @PutMapping("/user/{userId}/read-all")
    public ResponseEntity<Void> markAllAsRead(@PathVariable UUID userId) {
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok().build();
    }
}