package org.example.userservice.dto;

import lombok.Data;

@Data
public class SendDeveloperInvitationRequest {
    private String toEmail;
    private String managerName;
    private String invitationToken;
    private String serviceName;
}