// NotificationDTO.java
package com.testai.notificationservice.dto;

import lombok.Builder;
import lombok.Data;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class NotificationDTO {
    private UUID id;
    private String type;
    private String title;
    private String message;
    private UUID projectId;
    private Boolean isRead;
    private Instant createdAt;
    private Map<String, Object> metadata;
}