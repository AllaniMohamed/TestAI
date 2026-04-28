// SendNotificationRequest.java
package com.testai.notificationservice.dto;

import lombok.Data;
import java.util.Map;
import java.util.UUID;

@Data
public class SendNotificationRequest {
    private UUID recipientUserId;
    private String type;
    private String title;
    private String message;
    private UUID projectId;
    private Map<String, Object> metadata;
}