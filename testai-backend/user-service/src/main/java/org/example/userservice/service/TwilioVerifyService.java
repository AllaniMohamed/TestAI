package org.example.userservice.service;

import com.twilio.Twilio;
import com.twilio.rest.verify.v2.service.Verification;
import com.twilio.rest.verify.v2.service.VerificationCheck;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;
/**
 * Service pour gérer la vérification de téléphone avec Twilio Verify
 */
@Service
@Slf4j
public class TwilioVerifyService {

    @Value("${twilio.account-sid}")
    private String accountSid;

    @Value("${twilio.auth-token}")
    private String authToken;

    @Value("${twilio.verify-service-sid}")
    private String verifyServiceSid;

    /**
     * Initialiser Twilio au démarrage de l'application
     */
    @PostConstruct
    public void init() {
        try {
            Twilio.init(accountSid, authToken);
            log.info("✅ Twilio Verify initialisé avec succès (Service SID: {})", verifyServiceSid);
        } catch (Exception e) {
            log.error("❌ Erreur lors de l'initialisation de Twilio Verify: {}", e.getMessage());
        }
    }

    /**
     * Envoyer un code de vérification par SMS
     * Twilio génère automatiquement le code et l'envoie
     *
     * @param phoneNumber Numéro de téléphone au format international (+33612345678)
     */
    public void sendVerificationCode(String phoneNumber) {
        try {
            Verification verification = Verification.creator(
                    verifyServiceSid, phoneNumber, "sms"
            ).create();

// Ajoute ces logs détaillés
            log.info("Status: {}", verification.getStatus());
            log.info("SID: {}", verification.getSid());
            log.info("To: {}", verification.getTo());
            log.info("Channel: {}", verification.getChannel());

            log.info("✅ Code de vérification envoyé à {} (Status: {})",
                    phoneNumber, verification.getStatus());

        } catch (Exception e) {
            log.error("❌ Erreur lors de l'envoi du code à {}: {}",
                    phoneNumber, e.getMessage());
            throw new RuntimeException("Impossible d'envoyer le code de vérification: " + e.getMessage());
        }
    }


    public boolean verifyCode(String phoneNumber, String code) {
        try {
            VerificationCheck verificationCheck = VerificationCheck.creator(verifyServiceSid).setTo(phoneNumber).setCode(code).create();

            boolean isValid = "approved".equals(verificationCheck.getStatus());

            if (isValid) {
                log.info("✅ Code vérifié avec succès pour {}", phoneNumber);
            } else {
                log.warn("⚠️ Code incorrect pour {} (Status: {})",
                        phoneNumber, verificationCheck.getStatus());
            }

            return isValid;

        } catch (Exception e) {
            log.error("❌ Erreur lors de la vérification du code pour {}: {}",
                    phoneNumber, e.getMessage());
            return false;
        }
    }

    /**
     * Vérifier le format du numéro de téléphone
     * Doit être au format international : +33612345678
     *
     * @param phoneNumber Numéro à vérifier
     * @return true si le format est valide
     */
    public boolean isValidPhoneNumber(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.isEmpty()) {
            return false;
        }

        // Vérifier que le numéro commence par + et contient 10-15 chiffres
        return phoneNumber.matches("^\\+[1-9]\\d{9,14}$");
    }

    /**
     * Formater un numéro de téléphone français
     * Convertit 0612345678 en +33612345678
     *a
     * @param phoneNumber Numéro à formater
     * @return Numéro au format international
     */
    public String formatFrenchPhoneNumber(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.isEmpty()) {
            return null;
        }

        // Supprimer tous les espaces, tirets, points
        phoneNumber = phoneNumber.replaceAll("[\\s\\-\\.]", "");

        // Si commence par 0 et fait 10 chiffres, c'est un numéro français
        if (phoneNumber.matches("^0[1-9]\\d{8}$")) {
            return "+33" + phoneNumber.substring(1);
        }

        // Si commence déjà par +33
        if (phoneNumber.startsWith("+33")) {
            return phoneNumber;
        }

        // Si commence par 33 sans +
        if (phoneNumber.matches("^33[1-9]\\d{8}$")) {
            return "+" + phoneNumber;
        }

        // Sinon retourner tel quel (autres pays)
        return phoneNumber;
    }
}