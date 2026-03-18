package org.example.userservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    /**
     * Envoyer un email de vérification (inscription initiale)
     */
    public void sendVerificationEmail(String toEmail, String userName, String token) {
        try {
            String verificationUrl = frontendUrl + "/verify-email?token=" + token;

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("TestAI - Vérifiez votre adresse email");
            message.setText(
                    "Bonjour " + userName + ",\n\n" +
                            "Merci de vous être inscrit sur TestAI !\n\n" +
                            "Pour activer votre compte, veuillez cliquer sur le lien ci-dessous :\n\n" +
                            verificationUrl + "\n\n" +
                            "Ce lien est valable pendant 24 heures.\n\n" +
                            "Si vous n'avez pas créé de compte, ignorez cet email.\n\n" +
                            "Cordialement,\n" +
                            "L'équipe TestAI"
            );

            mailSender.send(message);
            log.info("✅ Email de vérification envoyé à {}", toEmail);

        } catch (Exception e) {
            log.error("❌ Erreur lors de l'envoi de l'email à {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Impossible d'envoyer l'email de vérification", e);
        }
    }

    /**
     * Renvoyer un email de vérification (même méthode que sendVerificationEmail)
     */
    public void resendVerificationEmail(String toEmail, String userName, String token) {
        // Utilise la même logique que sendVerificationEmail
        sendVerificationEmail(toEmail, userName, token);
        log.info("📧 Email de vérification renvoyé à {}", toEmail);
    }

    /**
     * Envoyer un email de réinitialisation de mot de passe
     */
    public void sendPasswordResetEmail(String toEmail, String userName, String resetToken) {
        try {
            String resetUrl = frontendUrl + "/reset-password?token=" + resetToken;

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("TestAI - Réinitialisation de votre mot de passe");
            message.setText(
                    "Bonjour " + userName + ",\n\n" +
                            "Vous avez demandé la réinitialisation de votre mot de passe sur TestAI.\n\n" +
                            "Pour créer un nouveau mot de passe, cliquez sur le lien suivant :\n\n" +
                            resetUrl + "\n\n" +
                            "Ce lien est valable pendant 1 heure.\n\n" +
                            "Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. " +
                            "Votre mot de passe actuel restera inchangé.\n\n" +
                            "Pour votre sécurité, ne partagez jamais ce lien.\n\n" +
                            "Cordialement,\n" +
                            "L'équipe TestAI"
            );

            mailSender.send(message);
            log.info("✅ Email de réinitialisation de mot de passe envoyé à {}", toEmail);

        } catch (Exception e) {
            log.error("❌ Erreur lors de l'envoi de l'email de réinitialisation à {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Impossible d'envoyer l'email de réinitialisation", e);
        }
    }

    /**
     * Envoyer un email d'invitation développeur
     */
    public void sendDeveloperInvitation(String toEmail, String managerName, String invitationToken, String serviceName) {
        try {
            String activationUrl = frontendUrl + "/invitations/activate?token=" + invitationToken;

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("TestAI - Invitation à rejoindre l'équipe");
            message.setText(
                    "Bonjour,\n\n" +
                            managerName + " vous invite à rejoindre TestAI en tant que développeur" +
                            (serviceName != null ? " pour le service \"" + serviceName + "\"" : "") + ".\n\n" +
                            "Pour activer votre compte, cliquez sur le lien ci-dessous :\n\n" +
                            activationUrl + "\n\n" +
                            "Ce lien est valable pendant 7 jours.\n\n" +
                            "Vous pourrez définir votre mot de passe lors de l'activation.\n\n" +
                            "Cordialement,\n" +
                            "L'équipe TestAI"
            );

            mailSender.send(message);
            log.info("✅ Email d'invitation développeur envoyé à {}", toEmail);

        } catch (Exception e) {
            log.error("❌ Erreur lors de l'envoi de l'invitation à {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Impossible d'envoyer l'email d'invitation", e);
        }
    }

    /**
     * Envoyer un email d'invitation de partage de service
     */
    public void sendShareInvitationEmail(
            String toEmail,
            String developerName,
            String managerName,
            String projectName,
            String projectDescription,
            String invitationToken
    ) {
        try {
            String invitationUrl = frontendUrl + "/invite/" + invitationToken;

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("TestAI - Invitation à rejoindre un service");
            message.setText(
                    "Bonjour " + developerName + ",\n\n" +
                            managerName + " vous a invité à rejoindre le service \"" + projectName + "\" sur TestAI.\n\n" +
                            "Description : " + projectDescription + "\n\n" +
                            "Pour accepter cette invitation et accéder au service, cliquez sur le lien ci-dessous :\n\n" +
                            invitationUrl + "\n\n" +
                            "Vous pourrez consulter les tests et rapports de ce service.\n\n" +
                            "Si vous n'avez pas de compte TestAI, vous pourrez en créer un directement en cliquant sur le lien.\n\n" +
                            "Cordialement,\n" +
                            "L'équipe TestAI"
            );

            mailSender.send(message);
            log.info("✅ Email d'invitation de partage envoyé à {}", toEmail);

        } catch (Exception e) {
            log.error("❌ Erreur lors de l'envoi de l'email d'invitation de partage à {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Impossible d'envoyer l'email d'invitation de partage", e);
        }
    }
}