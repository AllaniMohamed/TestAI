package org.example.userservice.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.userservice.dto.SendDeveloperInvitationRequest;
import org.example.userservice.dto.SendPasswordResetRequest;
import org.example.userservice.dto.SendShareInvitationRequest;
import org.example.userservice.dto.SendVerificationEmailRequest;
import org.example.userservice.service.EmailService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/email")
@RequiredArgsConstructor
@Slf4j
public class EmailController {

    private final EmailService emailService;

    /**
     * Envoyer un email d'invitation de partage
     * Accessible depuis project-service via Feign
     */
    @PostMapping("/share-invitation")
    @PreAuthorize("hasAnyRole('MANAGER')")  // SERVICE pour les appels inter-services
    public ResponseEntity<Void> sendShareInvitation(@RequestBody SendShareInvitationRequest request) {
        log.info("📧 Demande d'envoi d'email de partage vers {}", request.getToEmail());

        emailService.sendShareInvitationEmail(
                request.getToEmail(),
                request.getDeveloperName(),
                request.getManagerName(),
                request.getProjectName(),
                request.getProjectDescription(),
                request.getInvitationToken()
        );

        return ResponseEntity.ok().build();
    }

    /**
     * Envoyer un email de vérification
     */
    @PostMapping("/verification")
    public ResponseEntity<Void> sendVerification(@RequestBody SendVerificationEmailRequest request) {
        emailService.sendVerificationEmail(
                request.getToEmail(),
                request.getUserName(),
                request.getToken()
        );
        return ResponseEntity.ok().build();
    }

    /**
     * Envoyer un email de réinitialisation de mot de passe
     */
    @PostMapping("/password-reset")
    public ResponseEntity<Void> sendPasswordReset(@RequestBody SendPasswordResetRequest request) {
        emailService.sendPasswordResetEmail(
                request.getToEmail(),
                request.getUserName(),
                request.getResetToken()
        );
        return ResponseEntity.ok().build();
    }

    /**
     * Envoyer un email d'invitation développeur
     */
    @PostMapping("/developer-invitation")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<Void> sendDeveloperInvitation(@RequestBody SendDeveloperInvitationRequest request) {
        emailService.sendDeveloperInvitation(
                request.getToEmail(),
                request.getManagerName(),
                request.getInvitationToken(),
                request.getServiceName()
        );
        return ResponseEntity.ok().build();
    }
}