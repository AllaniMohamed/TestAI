package org.example.executionservice.feignclient;


import org.example.executionservice.config.feignConfiguration;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.Map;
import java.util.UUID;

@FeignClient(name = "notification-service" )
public interface NotificationServiceClient {

    @PostMapping("/api/notifications/send")
    void sendNotification(@RequestBody NotificationRequest request);

    // DTO inline pour éviter les dépendances croisées
    record NotificationRequest(
            UUID recipientUserId,
            String type,
            String title,
            String message,
            UUID projectId,
            Map<String, Object> metadata
    ) {}
}