package com.testai.projectservice.dto;

import lombok.Builder;
import lombok.Data;
import java.util.UUID;

@Data
@Builder
public class AutomationStatusDTO {
    private UUID projectId;
    private String projectName;
    private String projectUrl;
    private UUID automationUserId;
    private Integer automationHour;
    private Integer automationMinute;
    private String automationDays;
}