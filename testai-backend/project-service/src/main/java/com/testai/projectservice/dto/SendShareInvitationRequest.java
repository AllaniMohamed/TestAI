package com.testai.projectservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SendShareInvitationRequest {
    private String toEmail;
    private String developerName;
    private String managerName;
    private String projectName;
    private String projectDescription;
    private String invitationToken;
}