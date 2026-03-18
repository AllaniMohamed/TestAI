package org.example.userservice.dto;

import lombok.Data;

/**
 * DTO pour l'inscription d'un développeur via invitation
 *
 * Utilisé uniquement pour les développeurs qui:
 * 1. Ont reçu une invitation de partage
 * 2. N'ont pas encore de compte
 * 3. S'inscrivent via le lien d'invitation
 *
 * Le rôle sera TOUJOURS DEVELOPER (forcé dans le service)
 */
@Data
public class RegisterWithInvitationRequest {

    /**
     * Email du développeur (pré-rempli depuis l'invitation)
     * Doit correspondre à l'email de l'invitation
     */
    private String email;

    /**
     * Nom complet du développeur
     * Ex: "John Developer"
     */
    private String name;

    /**
     * Mot de passe choisi par le développeur
     * Minimum 6 caractères recommandé
     */
    private String password;

    /**
     * Numéro de téléphone (optionnel)
     * Formats acceptés:
     * - International: +33612345678
     * - Français: 0612345678
     *
     * Si fourni, sera validé et formaté automatiquement
     * Si PHONE_VERIFICATION_ENABLED=true, un SMS sera envoyé
     */
    private String phoneNumber;

    /**
     * Nom de l'entreprise du développeur (optionnel)
     * Ex: "Dev Company Inc."
     */
    private String company;

    /**
     * Token de l'invitation
     * Utilisé pour:
     * 1. Tracer l'origine de l'inscription
     * 2. Lier automatiquement les SharedAccess
     * 3. Statistiques sur les invitations
     */
    private String invitationToken;
}