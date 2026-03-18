package com.testai.projectservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ActivateInvitationResponse {
    private boolean hasAccount;      // true si le développeur a déjà un compte
    private String email;            // Email du développeur
    private String invitationToken;  // Token pour le register
    private String projectName;      // Nom du projet partagé
}