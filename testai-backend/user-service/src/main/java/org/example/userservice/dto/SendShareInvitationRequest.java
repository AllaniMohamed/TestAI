package org.example.userservice.dto;

import lombok.Data;

@Data
public class SendShareInvitationRequest {
    private String toEmail;
    private String developerName;
    private String managerName;
    private String projectName;
    private String projectDescription;
    private String invitationToken;
}