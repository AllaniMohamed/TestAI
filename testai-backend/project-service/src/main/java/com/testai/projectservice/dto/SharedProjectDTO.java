package com.testai.projectservice.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class SharedProjectDTO {
    private UUID projectId;
    private String projectName;
    private String projectDescription;
    private String projectUrl;
    private String managerName;
    private String accessLevel;
    private LocalDateTime sharedAt;
    private String managerEmail;

}