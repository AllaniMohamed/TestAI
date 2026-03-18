package com.testai.projectservice.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class InvitationInfoDTO {
    private String projectName;
    private String projectDescription;
    private String managerName;
    private String developerEmail;
    private String developerName;
    private String accessLevel;
    private String status;
    private LocalDateTime invitedAt;
}