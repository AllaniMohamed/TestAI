package org.example.userservice.service;

import org.example.userservice.FeignClient.ProjectServiceClient;
import org.example.userservice.dto.*;
import org.example.userservice.entity.User;
import org.example.userservice.entity.User.UserRole;
import org.example.userservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.*;

@Service
@Slf4j
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final KeycloakService keycloakService;
    private final TransactionTemplate transactionTemplate;
    private final EmailService emailService;
    private final TwilioVerifyService twilioVerifyService;
    private final ProjectServiceClient projectServiceClient;
    @Autowired
    private FileStorageService fileStorageService;


    // ⭐️ CONFIGURATION : Activer/Désactiver la vérification téléphone
    private static final boolean PHONE_VERIFICATION_ENABLED = true; // ← Mettre à true pour activer

    /**
     * ⭐️ INSCRIPTION AVEC VALIDATION EMAIL (ET TÉLÉPHONE OPTIONNEL)
     *
     * Flux :
     * 1. Vérifier email et téléphone non utilisés
     * 2. Créer utilisateur en DB (inactif, pas encore dans Keycloak)
     * 3. Envoyer email de vérification
     * 4. SI PHONE_VERIFICATION_ENABLED : Envoyer SMS de vérification
     * 5. Retourner message approprié
     */
    @Transactional
    public Map<String, Object> register(RegisterRequest request) {
        log.info("Tentative d'inscription pour l'email: {} et téléphone: {}",
                request.getEmail(), request.getPhoneNumber());

        // 1. Vérifier si l'email existe déjà
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Cet email est déjà utilisé");
        }

        String formattedPhone = null;

        // 2. Valider le téléphone seulement si fourni
        if (request.getPhoneNumber() != null && !request.getPhoneNumber().isEmpty()) {
            formattedPhone = twilioVerifyService.formatFrenchPhoneNumber(request.getPhoneNumber());

            if (!twilioVerifyService.isValidPhoneNumber(formattedPhone)) {
                throw new RuntimeException("Format de numéro de téléphone invalide. Utilisez le format international (+33612345678) ou français (0612345678)");
            }

            // Vérifier si le téléphone est déjà utilisé
            /*
            if (userRepository.findByPhoneNumber(formattedPhone).isPresent()) {
                throw new RuntimeException("Ce numéro de téléphone est déjà utilisé par un autre compte");
            }

             */
        }

        // 3. Déterminer le rôle
        String role = request.getRole();
        if (role == null || role.isEmpty()) {
            role = "MANAGER";
        }

        if (!role.equals("ADMIN") && !role.equals("MANAGER") && !role.equals("DEVELOPER")) {
            throw new RuntimeException("Rôle invalide");
        }

        // 4. Générer les tokens de vérification
        String emailVerificationToken = UUID.randomUUID().toString();
        Instant emailTokenExpiresAt = Instant.now().plusSeconds(86400); // 24 heures

        // 5. Créer l'utilisateur dans PostgreSQL (INACTIF, pas encore dans Keycloak)
        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setRole(UserRole.valueOf(role));
        user.setKeycloakId(null); // Sera créé après vérification
        user.setCompany(request.getCompany());
        user.setIsActive(false); // Inactif jusqu'à vérification

        // Vérification email
        user.setEmailVerified(false);
        user.setEmailVerificationToken(emailVerificationToken);
        user.setVerificationTokenExpiresAt(emailTokenExpiresAt);
        user.setTempPassword(request.getPassword());

        // Vérification téléphone
        user.setPhoneNumber(formattedPhone);
        // ⭐️ SI VÉRIFICATION TÉLÉPHONE DÉSACTIVÉE : Marquer comme déjà vérifié
        user.setPhoneVerified(!PHONE_VERIFICATION_ENABLED); // true si désactivé, false si activé
        user.setPhoneVerificationAttempts(0);
        user.setPhoneVerificationSentAt(PHONE_VERIFICATION_ENABLED ? Instant.now() : null);

        user = userRepository.save(user);
        log.info("✅ Utilisateur pré-enregistré dans PostgreSQL avec l'ID: {}", user.getId());

        // 6. Envoyer l'email de vérification
        try {
            emailService.sendVerificationEmail(
                    user.getEmail(),
                    user.getName(),
                    emailVerificationToken
            );
            log.info("📧 Email de vérification envoyé à {}", user.getEmail());
        } catch (Exception e) {
            log.error("⚠️ Impossible d'envoyer l'email: {}", e.getMessage());
            // Supprimer l'utilisateur si l'email échoue
            userRepository.delete(user);
            throw new RuntimeException("Impossible d'envoyer l'email de vérification. Veuillez réessayer.");
        }

        // ========================================
        //  SECTION TÉLÉPHONE - DÉSACTIVÉE TEMPORAIREMENT
        // Décommentez cette section quand votre pays autorisera les SMS
        // ========================================

        // 7. Envoyer le SMS de vérification (SI ACTIVÉ)
        if (PHONE_VERIFICATION_ENABLED && formattedPhone != null) {
            try {
                twilioVerifyService.sendVerificationCode(formattedPhone);
                log.info("📱 SMS de vérification envoyé au {}", formattedPhone);
            } catch (Exception e) {
                log.error("⚠️ Impossible d'envoyer le SMS: {}", e.getMessage());
                // Supprimer l'utilisateur si le SMS échoue
                userRepository.delete(user);
                throw new RuntimeException("Impossible d'envoyer le SMS de vérification. Vérifiez le numéro de téléphone.");
            }
        }


        // 8. Retourner la réponse appropriée
        if (PHONE_VERIFICATION_ENABLED && formattedPhone != null) {
            return Map.of(
                    "success", true,
                    "message", "📧 Un email de vérification a été envoyé à " + user.getEmail() +
                            " et 📱 un SMS a été envoyé au " + formattedPhone +
                            ". Veuillez vérifier les deux pour activer votre compte.",
                    "email", user.getEmail(),
                    "phoneNumber", formattedPhone,
                    "requiresEmailVerification", true,
                    "requiresPhoneVerification", true
            );
        } else {
            // Vérification téléphone désactivée
            return Map.of(
                    "success", true,
                    "message", "📧 Un email de vérification a été envoyé à " + user.getEmail() +
                            ". Veuillez vérifier votre email pour activer votre compte.",
                    "email", user.getEmail(),
                    "requiresEmailVerification", true,
                    "requiresPhoneVerification", false,
                    "note", "⚠️ Vérification par téléphone temporairement désactivée"
            );
        }
    }

    /**
     * ⭐️ VÉRIFIER LE CODE SMS
     * Cette méthode reste disponible pour quand vous réactiverez la vérification téléphone
     */
    @Transactional
    public Map<String, Object> verifyPhoneNumber(String email, String code) {
        if (!PHONE_VERIFICATION_ENABLED) {
            throw new RuntimeException("La vérification par téléphone est temporairement désactivée");
        }

        log.info("Tentative de vérification du téléphone pour: {}", email);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        if (user.getPhoneNumber() == null || user.getPhoneNumber().isEmpty()) {
            throw new RuntimeException("Aucun numéro de téléphone enregistré");
        }

        if (user.getPhoneVerified()) {
            if (user.getEmailVerified()) {
                return Map.of(
                        "success", true,
                        "message", "✅ Votre compte est déjà entièrement vérifié",
                        "emailVerified", true,
                        "phoneVerified", true,
                        "accountActive", user.getIsActive()
                );
            } else {
                return Map.of(
                        "success", true,
                        "message", "✅ Téléphone déjà vérifié. Veuillez vérifier votre email pour activer votre compte.",
                        "emailVerified", false,
                        "phoneVerified", true,
                        "accountActive", false
                );
            }
        }

        if (user.getPhoneVerificationAttempts() >= 3) {
            throw new RuntimeException("Nombre maximum de tentatives atteint. Veuillez demander un nouveau code.");
        }

        // Vérifier le code avec Twilio Verify
        boolean isValid = twilioVerifyService.verifyCode(user.getPhoneNumber(), code);

        if (!isValid) {
            user.setPhoneVerificationAttempts(user.getPhoneVerificationAttempts() + 1);
            userRepository.save(user);

            int remainingAttempts = 3 - user.getPhoneVerificationAttempts();
            if (remainingAttempts > 0) {
                throw new RuntimeException("Code incorrect. Il vous reste " + remainingAttempts + " tentative(s).");
            } else {
                throw new RuntimeException("Code incorrect. Nombre maximum de tentatives atteint.");
            }
        }

        user.setPhoneVerified(true);
        user.setPhoneVerificationAttempts(0);
        userRepository.save(user);

        log.info("✅ Numéro de téléphone vérifié pour {}", email);

        if (user.getEmailVerified()) {
            return createKeycloakAccountAndActivate(user);
        } else {
            return Map.of(
                    "success", true,
                    "message", "✅ Téléphone vérifié ! Veuillez maintenant vérifier votre email pour activer votre compte.",
                    "emailVerified", false,
                    "phoneVerified", true,
                    "accountActive", false
            );
        }
    }

    /**
     * ⭐️ VÉRIFIER L'EMAIL ET ACTIVER LE COMPTE
     * Si vérification téléphone désactivée, active directement le compte
     */
    @Transactional
    public Map<String, Object> verifyEmailAndActivate(String token) {
        log.info("Tentative de vérification email avec token: {}", token);

        User user = userRepository.findByEmailVerificationToken(token)
                .orElseThrow(() -> new RuntimeException("Token de vérification invalide ou expiré"));

        if (user.getVerificationTokenExpiresAt() == null ||
                user.getVerificationTokenExpiresAt().isBefore(Instant.now())) {
            throw new RuntimeException("Le lien de vérification a expiré. Veuillez demander un nouveau lien.");
        }

        if (user.getEmailVerified()) {
            // Email déjà vérifié
            if (user.getPhoneVerified() && user.getIsActive()) {
                return Map.of(
                        "success", true,
                        "message", "✅ Votre compte est déjà entièrement vérifié et actif",
                        "emailVerified", true,
                        "phoneVerified", true,
                        "accountActive", true
                );
            } else if (user.getPhoneVerified() && !user.getIsActive()) {
                return createKeycloakAccountAndActivate(user);
            } else if (PHONE_VERIFICATION_ENABLED) {
                return Map.of(
                        "success", true,
                        "message", "✅ Email déjà vérifié. Veuillez vérifier votre téléphone pour activer votre compte.",
                        "emailVerified", true,
                        "phoneVerified", false,
                        "accountActive", false
                );
            } else {
                // Téléphone désactivé, activer directement
                return createKeycloakAccountAndActivate(user);
            }
        }

        // Marquer l'email comme vérifié
        user.setEmailVerified(true);
        user.setEmailVerificationToken(null);
        user.setVerificationTokenExpiresAt(null);
        userRepository.save(user);

        log.info("✅ Email vérifié pour {}", user.getEmail());

        // ⭐️ Si vérification téléphone ACTIVÉE : vérifier si téléphone aussi vérifié
        if (PHONE_VERIFICATION_ENABLED) {
            if (user.getPhoneVerified()) {
                // LES DEUX sont vérifiés : activer
                return createKeycloakAccountAndActivate(user);
            } else {
                // Email vérifié mais pas le téléphone
                return Map.of(
                        "success", true,
                        "message", "✅ Email vérifié ! Veuillez maintenant vérifier votre téléphone (SMS envoyé au " +
                                user.getPhoneNumber() + ") pour activer votre compte.",
                        "emailVerified", true,
                        "phoneVerified", false,
                        "accountActive", false
                );
            }
        } else {
            // ⭐️ Vérification téléphone DÉSACTIVÉE : activer directement après email
            log.info("📱 Vérification téléphone désactivée - activation directe du compte");
            return createKeycloakAccountAndActivate(user);
        }
    }

    /**
     * ⭐️ MÉTHODE PRIVÉE : Créer le compte Keycloak et activer l'utilisateur
     */
    private Map<String, Object> createKeycloakAccountAndActivate(User user) {
        // Créer l'utilisateur dans Keycloak
        String keycloakId;
        try {
            keycloakId = keycloakService.createUser(
                    user.getEmail(),
                    user.getTempPassword(),
                    user.getName(),
                    user.getRole().name()
            );
            log.info("✅ Utilisateur créé dans Keycloak avec l'ID: {}", keycloakId);
        } catch (Exception e) {
            log.error("❌ Erreur création Keycloak: {}", e.getMessage());
            throw new RuntimeException("Erreur lors de la création du compte: " + e.getMessage());
        }

        // Activer le compte
        user.setKeycloakId(keycloakId);
        user.setIsActive(true);
        user.setTempPassword(null);
        userRepository.save(user);

        // ⭐️ Lier les invitations en attente si le rôle est DEVELOPER
        if (user.getRole() == UserRole.DEVELOPER) {
            try {
                projectServiceClient.linkSharedAccess(user.getEmail(), user.getId());
                log.info("✅ Invitations liées pour le développeur {}", user.getEmail());
            } catch (Exception e) {
                log.warn("⚠️ Impossible de lier les invitations pour {} : {}", user.getEmail(), e.getMessage());
                // Ne pas bloquer l'activation du compte
            }
        }

        String message;
        if (PHONE_VERIFICATION_ENABLED) {
            message = "🎉 Votre compte est maintenant entièrement activé ! Email ET téléphone vérifiés. Vous pouvez vous connecter.";
            log.info("✅ Compte entièrement activé pour {} (Email ET Téléphone vérifiés)", user.getEmail());
        } else {
            message = "🎉 Votre compte est maintenant activé ! Email vérifié. Vous pouvez vous connecter.";
            log.info("✅ Compte activé pour {} (Email vérifié)", user.getEmail());
        }

        return Map.of(
                "success", true,
                "message", message,
                "emailVerified", true,
                "phoneVerified", user.getPhoneVerified(),
                "accountActive", true
        );
    }
    /**
     * ⭐️ INSCRIPTION VIA INVITATION (DEVELOPER uniquement)
     *
     * Différences avec register() :
     * - Rôle forcé à DEVELOPER
     * - Liaison automatique des SharedAccess
     * - Même flux de vérification email/téléphone
     *
     * Flux :
     * 1. Vérifier email et téléphone non utilisés
     * 2. Créer utilisateur avec rôle DEVELOPER (inactif)
     * 3. Envoyer email de vérification
     * 4. SI PHONE_VERIFICATION_ENABLED : Envoyer SMS
     * 5. Lier les SharedAccess en attente
     * 6. Retourner message approprié
     */
    @Transactional
    public Map<String, Object> registerWithInvitation(RegisterWithInvitationRequest request) {
        log.info("📨 Inscription via invitation pour l'email: {} et téléphone: {}",
                request.getEmail(), request.getPhoneNumber());

        // 1. Vérifier si l'email existe déjà
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Cet email est déjà utilisé");
        }

        String formattedPhone = null;

        // 2. Valider le téléphone seulement si fourni
        if (request.getPhoneNumber() != null && !request.getPhoneNumber().isEmpty()) {
            formattedPhone = twilioVerifyService.formatFrenchPhoneNumber(request.getPhoneNumber());

            if (!twilioVerifyService.isValidPhoneNumber(formattedPhone)) {
                throw new RuntimeException("Format de numéro de téléphone invalide. Utilisez le format international (+33612345678) ou français (0612345678)");
            }

            // Vérification téléphone unique désactivée (commentée dans register aussi)
        /*
        if (userRepository.findByPhoneNumber(formattedPhone).isPresent()) {
            throw new RuntimeException("Ce numéro de téléphone est déjà utilisé par un autre compte");
        }
        */
        }

        // 3. ⭐ Rôle FORCÉ à DEVELOPER pour les invitations
        String role = "DEVELOPER";
        log.info("🔐 Création compte DEVELOPER via invitation pour {}", request.getEmail());

        // 4. Générer les tokens de vérification
        String emailVerificationToken = UUID.randomUUID().toString();
        Instant emailTokenExpiresAt = Instant.now().plusSeconds(86400); // 24 heures

        // 5. Créer l'utilisateur dans PostgreSQL (INACTIF, pas encore dans Keycloak)
        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setRole(UserRole.DEVELOPER);  // ⭐ DEVELOPER pour invitation
        user.setKeycloakId(null); // Sera créé après vérification
        user.setCompany(request.getCompany());
        user.setIsActive(false); // Inactif jusqu'à vérification

        // Vérification email
        user.setEmailVerified(false);
        user.setEmailVerificationToken(emailVerificationToken);
        user.setVerificationTokenExpiresAt(emailTokenExpiresAt);
        user.setTempPassword(request.getPassword());

        // Vérification téléphone
        user.setPhoneNumber(formattedPhone);
        // ⭐️ SI VÉRIFICATION TÉLÉPHONE DÉSACTIVÉE : Marquer comme déjà vérifié
        user.setPhoneVerified(!PHONE_VERIFICATION_ENABLED); // true si désactivé, false si activé
        user.setPhoneVerificationAttempts(0);
        user.setPhoneVerificationSentAt(PHONE_VERIFICATION_ENABLED ? Instant.now() : null);

        user = userRepository.save(user);
        log.info("✅ Développeur pré-enregistré dans PostgreSQL avec l'ID: {}", user.getId());

        // 6. ⭐ Lier les SharedAccess en attente (AVANT l'envoi des emails)
        // Cela permet de vérifier que l'invitation existe bien
        try {
            projectServiceClient.linkSharedAccess(user.getEmail(), user.getId());
            log.info("✅ SharedAccess liés pour le développeur {}", user.getEmail());
        } catch (Exception e) {
            log.warn("⚠️ Impossible de lier les invitations pour {} : {}", user.getEmail(), e.getMessage());
            // Ne pas bloquer l'inscription, mais logger l'erreur
            // Les SharedAccess seront liés lors de l'activation du compte
        }

        // 7. Envoyer l'email de vérification
        try {
            emailService.sendVerificationEmail(
                    user.getEmail(),
                    user.getName(),
                    emailVerificationToken
            );
            log.info("📧 Email de vérification envoyé à {}", user.getEmail());
        } catch (Exception e) {
            log.error("⚠️ Impossible d'envoyer l'email: {}", e.getMessage());
            // Supprimer l'utilisateur si l'email échoue
            userRepository.delete(user);
            throw new RuntimeException("Impossible d'envoyer l'email de vérification. Veuillez réessayer.");
        }

        // 8. Envoyer le SMS de vérification (SI ACTIVÉ)
        if (PHONE_VERIFICATION_ENABLED && formattedPhone != null) {
            try {
                twilioVerifyService.sendVerificationCode(formattedPhone);
                log.info("📱 SMS de vérification envoyé au {}", formattedPhone);
            } catch (Exception e) {
                log.error("⚠️ Impossible d'envoyer le SMS: {}", e.getMessage());
                // Supprimer l'utilisateur si le SMS échoue
                userRepository.delete(user);
                throw new RuntimeException("Impossible d'envoyer le SMS de vérification. Vérifiez le numéro de téléphone.");
            }
        }

        // 9. Retourner la réponse appropriée
        if (PHONE_VERIFICATION_ENABLED && formattedPhone != null) {
            return Map.of(
                    "success", true,
                    "message", "🎉 Compte DEVELOPER créé ! 📧 Un email de vérification a été envoyé à " + user.getEmail() +
                            " et 📱 un SMS a été envoyé au " + formattedPhone +
                            ". Veuillez vérifier les deux pour activer votre compte.",
                    "email", user.getEmail(),
                    "phoneNumber", formattedPhone,
                    "role", "DEVELOPER",
                    "invitationToken", request.getInvitationToken(),
                    "requiresEmailVerification", true,
                    "requiresPhoneVerification", true
            );
        } else {
            // Vérification téléphone désactivée
            return Map.of(
                    "success", true,
                    "message", "🎉 Compte DEVELOPER créé ! 📧 Un email de vérification a été envoyé à " + user.getEmail() +
                            ". Veuillez vérifier votre email pour activer votre compte.",
                    "email", user.getEmail(),
                    "role", "DEVELOPER",
                    "invitationToken", request.getInvitationToken(),
                    "requiresEmailVerification", true,
                    "requiresPhoneVerification", false,
                    "note", "⚠️ Vérification par téléphone temporairement désactivée"
            );
        }
    }

    /**
     * Connexion
     */
    @Transactional
    public AuthResponse login(LoginRequest request) {
        log.info("Tentative de connexion pour l'email: {}", request.getEmail());

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        // Vérifier email
        if (!user.getEmailVerified()) {
            throw new RuntimeException("Veuillez d'abord vérifier votre email. Un lien de vérification vous a été envoyé.");
        }

        // ⭐️ Vérifier téléphone SEULEMENT si la vérification est activée
        if (PHONE_VERIFICATION_ENABLED && !user.getPhoneVerified()) {
            throw new RuntimeException("Veuillez d'abord vérifier votre téléphone. Un SMS vous a été envoyé.");
        }

        // Vérifier compte actif
        if (!user.getIsActive()) {
            throw new RuntimeException("Compte en cours d'activation. Veuillez vérifier votre email" +
                    (PHONE_VERIFICATION_ENABLED ? " et téléphone." : "."));
        }

        Map<String, Object> keycloakResponse = keycloakService.authenticateUser(
                request.getEmail(),
                request.getPassword()
        );

        log.info("Authentification réussie pour l'utilisateur: {}", request.getEmail());

        user.setLastLogin(Instant.now());
        userRepository.save(user);

        UserDTO userDTO = mapToDTO(user);

        return new AuthResponse(
                (String) keycloakResponse.get("access_token"),
                (String) keycloakResponse.get("refresh_token"),
                (Integer) keycloakResponse.get("expires_in"),
                userDTO
        );
    }
    /**
     * Déconnexion — invalide la session Keycloak via le refresh token
     */
    public void logout(String refreshToken) {
        log.info("Déconnexion utilisateur - invalidation session Keycloak");
        keycloakService.logoutUser(refreshToken);
        log.info("✅ Session Keycloak invalidée");
    }

    /**
     * Renvoyer le code SMS
     */
    @Transactional
    public void resendPhoneVerificationCode(String email) {
        if (!PHONE_VERIFICATION_ENABLED) {
            throw new RuntimeException("La vérification par téléphone est temporairement désactivée");
        }

        log.info("Renvoi du code de vérification pour: {}", email);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        if (user.getPhoneNumber() == null || user.getPhoneNumber().isEmpty()) {
            throw new RuntimeException("Aucun numéro de téléphone enregistré");
        }

        if (user.getPhoneVerified()) {
            throw new RuntimeException("Numéro de téléphone déjà vérifié");
        }

        // Rate limiting
        if (user.getPhoneVerificationSentAt() != null) {
            long secondsSinceLastSMS = Instant.now().getEpochSecond() -
                    user.getPhoneVerificationSentAt().getEpochSecond();
            if (secondsSinceLastSMS < 60) {
                long waitTime = 60 - secondsSinceLastSMS;
                throw new RuntimeException("Veuillez attendre " + waitTime + " secondes avant de demander un nouveau code");
            }
        }

        user.setPhoneVerificationAttempts(0);
        user.setPhoneVerificationSentAt(Instant.now());
        userRepository.save(user);

        try {
            twilioVerifyService.sendVerificationCode(user.getPhoneNumber());
            log.info("✅ Nouveau code envoyé au {}", user.getPhoneNumber());
        } catch (Exception e) {
            log.error("❌ Erreur envoi SMS: {}", e.getMessage());
            throw new RuntimeException("Impossible d'envoyer le SMS");
        }
    }

    /**
     * Renvoyer l'email de vérification
     */
    @Transactional
    public void resendVerificationEmail(String email) {
        log.info("Demande de renvoi d'email de vérification pour {}", email);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        if (user.getEmailVerified()) {
            throw new RuntimeException("Email déjà vérifié");
        }

        String newToken = UUID.randomUUID().toString();
        Instant newExpiresAt = Instant.now().plusSeconds(86400);

        user.setEmailVerificationToken(newToken);
        user.setVerificationTokenExpiresAt(newExpiresAt);

        userRepository.save(user);

        emailService.resendVerificationEmail(
                user.getEmail(),
                user.getName(),
                newToken
        );

        log.info("📧 Email de vérification renvoyé à {}", email);
    }

    // Autres méthodes (inchangées)

    @Transactional(readOnly = true)
    public UserDTO getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        return mapToDTO(user);
    }

    @Transactional(readOnly = true)
    public UserDTO getUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        return mapToDTO(user);
    }


    public AuthResponse refreshToken(String refreshToken) {
        log.info("Rafraîchissement du token");

        Map<String, Object> keycloakResponse = keycloakService.refreshToken(refreshToken);

        return new AuthResponse(
                (String) keycloakResponse.get("access_token"),
                (String) keycloakResponse.get("refresh_token"),
                (Integer) keycloakResponse.get("expires_in"),
                null
        );
    }
    /**
     * ⭐ NOUVEAU : Mettre à jour l'avatar uniquement
     */
    @Transactional
    public UserDTO uploadAvatar(UUID userId, MultipartFile file) {
        log.info("Upload avatar pour l'utilisateur: {}", userId);

        // 1. Récupérer l'utilisateur
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        // 2. Supprimer l'ancien avatar si existe
        if (user.getAvatar() != null && !user.getAvatar().isEmpty()) {
            String oldFileName = fileStorageService.extractFileNameFromUrl(user.getAvatar());
            fileStorageService.deleteAvatar(oldFileName);
            log.info("🗑️ Ancien avatar supprimé pour {}", user.getEmail());
        }

        // 3. Stocker le nouvel avatar
        String fileName = fileStorageService.storeAvatar(file);
        String avatarUrl = fileStorageService.getAvatarUrl(fileName);

        // 4. Mettre à jour l'utilisateur
        user.setAvatar(avatarUrl);
        user = userRepository.save(user);

        log.info("✅ Avatar mis à jour pour {}: {}", user.getEmail(), avatarUrl);

        return mapToDTO(user);
    }

    /**
     * ⭐ MODIFIÉ : Mettre à jour les infos utilisateur (SANS avatar ici)
     * L'avatar est géré séparément via uploadAvatar()
     */
    @Transactional
    public UserDTO updateUser(UUID id, UserDTO userDTO) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        // Mettre à jour uniquement les champs textuels
        if (userDTO.getName() != null && !userDTO.getName().isEmpty()) {
            user.setName(userDTO.getName());
        }
        if (userDTO.getCompany() != null) {
            user.setCompany(userDTO.getCompany());
        }

        if(userDTO.getIsActive() != user.getIsActive()){
            user.setIsActive(userDTO.getIsActive());
        }

        // ⚠️ NE PAS permettre la mise à jour de l'avatar via ce endpoint
        // L'avatar doit être uploadé via uploadAvatar()

        user = userRepository.save(user);
        log.info("✅ Utilisateur mis à jour: {}", user.getId());

        return mapToDTO(user);
    }

    /**
     * ⭐ NOUVEAU : Supprimer l'avatar
     */
    @Transactional
    public UserDTO deleteAvatar(UUID userId) {
        log.info("Suppression avatar pour l'utilisateur: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        if (user.getAvatar() != null && !user.getAvatar().isEmpty()) {
            String fileName = fileStorageService.extractFileNameFromUrl(user.getAvatar());
            fileStorageService.deleteAvatar(fileName);

            user.setAvatar(null);
            user = userRepository.save(user);

            log.info("✅ Avatar supprimé pour {}", user.getEmail());
        }

        return mapToDTO(user);
    }

    private UserDTO mapToDTO(User user) {
        return new UserDTO(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.getAvatar(),
                user.getCompany(),
                user.getPhoneNumber(),
                user.getIsActive(),
                user.getCreatedAt(),
                user.getLastLogin()
        );
    }
    /**
     * Demander la réinitialisation du mot de passe
     * Génère un token et envoie un email
     */
    @Transactional
    public Map<String, Object> requestPasswordReset(String email) {
        log.info("Demande de réinitialisation de mot de passe pour: {}", email);

        // 1. Vérifier que l'utilisateur existe
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        // 2. Vérifier que le compte est actif
        if (!user.getIsActive()) {
            throw new RuntimeException("Ce compte est désactivé. Veuillez contacter le support.");
        }

        // 3. Rate limiting : Max 3 demandes par heure
        if (user.getPasswordResetRequestedAt() != null) {
            long minutesSinceLastRequest = (Instant.now().getEpochSecond() -
                    user.getPasswordResetRequestedAt().getEpochSecond()) / 60;

            if (minutesSinceLastRequest < 60) {
                if (user.getPasswordResetAttempts() >= 3) {
                    long waitTime = 60 - minutesSinceLastRequest;
                    throw new RuntimeException("Trop de tentatives. Veuillez réessayer dans " + waitTime + " minutes.");
                }
            } else {
                // Reset les tentatives après 1 heure
                user.setPasswordResetAttempts(0);
            }
        }

        // 4. Générer le token de réinitialisation
        String resetToken = UUID.randomUUID().toString();
        Instant expiresAt = Instant.now().plusSeconds(3600); // 1 heure

        // 5. Mettre à jour l'utilisateur
        user.setPasswordResetToken(resetToken);
        user.setPasswordResetTokenExpiresAt(expiresAt);
        user.setPasswordResetAttempts((user.getPasswordResetAttempts() != null ?
                user.getPasswordResetAttempts() : 0) + 1);
        user.setPasswordResetRequestedAt(Instant.now());

        userRepository.save(user);
        log.info("✅ Token de réinitialisation généré pour {}", email);

        // 6. Envoyer l'email
        try {
            emailService.sendPasswordResetEmail(
                    user.getEmail(),
                    user.getName(),
                    resetToken
            );
            log.info("📧 Email de réinitialisation envoyé à {}", email);
        } catch (Exception e) {
            log.error("⚠️ Impossible d'envoyer l'email: {}", e.getMessage());
            throw new RuntimeException("Impossible d'envoyer l'email de réinitialisation");
        }

        return Map.of(
                "success", true,
                "message", "📧 Un email de réinitialisation a été envoyé à " + email +
                        ". Le lien est valable pendant 1 heure.",
                "email", email
        );
    }

    /**
     * Vérifier le token de réinitialisation (pour afficher le formulaire)
     */
    @Transactional(readOnly = true)
    public Map<String, Object> validateResetToken(String token) {
        log.info("Validation du token de réinitialisation");

        User user = userRepository.findByPasswordResetToken(token)
                .orElseThrow(() -> new RuntimeException("Token de réinitialisation invalide ou expiré"));

        // Vérifier l'expiration
        if (user.getPasswordResetTokenExpiresAt() == null ||
                user.getPasswordResetTokenExpiresAt().isBefore(Instant.now())) {
            throw new RuntimeException("Ce lien de réinitialisation a expiré. Veuillez en demander un nouveau.");
        }

        return Map.of(
                "success", true,
                "email", user.getEmail(),
                "message", "Token valide"
        );
    }

    /**
     * Réinitialiser le mot de passe avec le token
     */
    @Transactional
    public Map<String, Object> resetPassword(ResetPasswordRequest request) {
        log.info("Tentative de réinitialisation de mot de passe avec token");

        // 1. Vérifier que les mots de passe correspondent
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("Les mots de passe ne correspondent pas");
        }

        // 2. Récupérer l'utilisateur par token
        User user = userRepository.findByPasswordResetToken(request.getToken())
                .orElseThrow(() -> new RuntimeException("Token de réinitialisation invalide ou expiré"));

        // 3. Vérifier l'expiration
        if (user.getPasswordResetTokenExpiresAt() == null ||
                user.getPasswordResetTokenExpiresAt().isBefore(Instant.now())) {
            throw new RuntimeException("Ce lien de réinitialisation a expiré. Veuillez en demander un nouveau.");
        }

        // 4. Mettre à jour le mot de passe dans Keycloak
        try {
            keycloakService.updateUserPassword(user.getKeycloakId(), request.getNewPassword());
            log.info("✅ Mot de passe mis à jour dans Keycloak pour {}", user.getEmail());
        } catch (Exception e) {
            log.error("❌ Erreur mise à jour mot de passe Keycloak: {}", e.getMessage());
            throw new RuntimeException("Impossible de mettre à jour le mot de passe: " + e.getMessage());
        }

        // 5. Nettoyer les champs de réinitialisation
        user.setPasswordResetToken(null);
        user.setPasswordResetTokenExpiresAt(null);
        user.setPasswordResetAttempts(0);
        user.setPasswordResetRequestedAt(null);

        userRepository.save(user);

        log.info("✅ Mot de passe réinitialisé avec succès pour {}", user.getEmail());

        return Map.of(
                "success", true,
                "message", "✅ Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.",
                "email", user.getEmail()
        );
    }

    public List<UserDTO> getAllUsers(){
        List<User> usersList = userRepository.findAll();
        List<UserDTO> userDTOList = new ArrayList<>();
        for(User user: usersList){
            userDTOList.add(mapToDTO(user));
        }
        return userDTOList;
    }

    public Map<String, String> deleteUserById(UUID id){
        Map<String, String> message = new HashMap<>();
        try{
            User user = userRepository.findById(id).orElseThrow();
            userRepository.delete(user);
            message.put("success", "User " + user.getName() + " deleted successfully!!");
        } catch (Exception e) {
            message.put("failed", e.toString());
        }
        return message;
    }

    public User getFullUserById(UUID id){
        User user = userRepository.findById(id).orElseThrow();
        return user;
    }

}