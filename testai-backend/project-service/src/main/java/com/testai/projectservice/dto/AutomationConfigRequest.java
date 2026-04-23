package com.testai.projectservice.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class AutomationConfigRequest {
    private Boolean enabled;
    private Integer hour;      // 0-23
    private Integer minute;    // 0-59
    private String days;       // "DAILY", "MON-FRI", "MON,WED,FRI"
    private UUID userId;
}