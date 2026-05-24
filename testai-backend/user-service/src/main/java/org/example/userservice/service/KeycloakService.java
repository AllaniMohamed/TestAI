package org.example.userservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class KeycloakService {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${keycloak.auth-server-url}")
    private String keycloakUrl;

    @Value("${keycloak.realm}")
    private String realm;

    @Value("${keycloak.resource}")
    private String clientId;

    @Value("${keycloak.credentials.secret}")
    private String clientSecret;

    /**
     * Créer un utilisateur dans Keycloak avec un rôle
     */
    public String createUser(String email, String password, String name, String role) {
        String userId = null;
        try {
            log.info("🔵 DÉBUT createUser - email: {}, role: {}", email, role);

            String adminToken = getAdminToken();
            log.info("✅ Token admin obtenu");

            String url = keycloakUrl + "/admin/realms/" + realm + "/users";
            log.info("📡 URL création utilisateur: {}", url);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(adminToken);

            Map<String, Object> user = new HashMap<>();
            user.put("username", email);
            user.put("email", email);
            user.put("firstName", name.split(" ")[0]);
            user.put("lastName", name.contains(" ") ? name.substring(name.indexOf(" ") + 1) : "");
            user.put("enabled", true);
            user.put("emailVerified", true);

            // Credentials
            Map<String, Object> credential = new HashMap<>();
            credential.put("type", "password");
            credential.put("value", password);
            credential.put("temporary", Boolean.FALSE);
            user.put("credentials", List.of(credential));

            log.info("📦 Payload utilisateur préparé: username={}, email={}", email, email);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(user, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    request,
                    String.class
            );

            log.info("📡 Réponse création utilisateur: status={}", response.getStatusCode());

            if (response.getStatusCode() != HttpStatus.CREATED) {
                log.error("❌ Création utilisateur échouée: status={}, body={}",
                        response.getStatusCodeValue(), response.getBody());
                throw new RuntimeException("Échec création utilisateur: status=" + response.getStatusCodeValue());
            }

            // Récupérer l'ID de l'utilisateur créé
            String location = response.getHeaders().getLocation() != null ?
                    response.getHeaders().getLocation().toString() : null;

            if (location == null) {
                log.error("❌ Location header absent: headers={}", response.getHeaders());
                throw new RuntimeException("Location header manquant");
            }

            userId = location.substring(location.lastIndexOf('/') + 1);
            log.info("✅ Utilisateur créé dans Keycloak avec l'ID: {}", userId);

            // ⭐️ CRITIQUE : Assigner le rôle
            log.info("🎯 Appel assignRoleToUser avec userId={}, role={}", userId, role);
            assignRoleToUser(userId, role, adminToken);
            log.info("✅ Rôle assigné avec succès");

            log.info("🔵 FIN createUser - userId: {}", userId);
            return userId;

        } catch (HttpClientErrorException e) {
            log.error("❌ Erreur HTTP création utilisateur: status={}, body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());

            // Si l'utilisateur a été créé mais le rôle a échoué, on retourne quand même l'ID
            if (userId != null) {
                log.warn("⚠️ Utilisateur créé mais rôle non assigné: {}", userId);
                return userId;
            }
            throw new RuntimeException("Impossible de créer l'utilisateur: " + e.getResponseBodyAsString(), e);

        } catch (Exception e) {
            log.error("❌ Erreur création utilisateur: {}", e.getMessage(), e);
            throw new RuntimeException("Impossible de créer l'utilisateur: " + e.getMessage(), e);
        }
    }

    /**
     * Assigner un rôle à un utilisateur
     */
    private void assignRoleToUser(String userId, String roleName, String adminToken) {
        try {
            log.info("🔍 === DÉBUT assignRoleToUser ===");
            log.info("🔍 userId: {}", userId);
            log.info("🔍 roleName: {}", roleName);
            log.info("🔍 realm: {}", realm);

            // 1. Récupérer le rôle realm
            String getRoleUrl = keycloakUrl + "/admin/realms/" + realm + "/roles/" + roleName;
            log.info("📡 GET role URL: {}", getRoleUrl);

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(adminToken);
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Void> getRequest = new HttpEntity<>(headers);

            ResponseEntity<Map> roleResponse = restTemplate.exchange(
                    getRoleUrl,
                    HttpMethod.GET,
                    getRequest,
                    Map.class
            );

            log.info("📡 Réponse GET role: status={}", roleResponse.getStatusCode());

            if (roleResponse.getStatusCode() != HttpStatus.OK || roleResponse.getBody() == null) {
                log.error("❌ Rôle '{}' non trouvé: status={}", roleName, roleResponse.getStatusCodeValue());
                throw new RuntimeException("Rôle '" + roleName + "' non trouvé dans Keycloak");
            }

            Map<String, Object> roleData = roleResponse.getBody();
            log.info("📦 Rôle trouvé: {}", roleData);
            log.info("📦 Rôle id: {}", roleData.get("id"));
            log.info("📦 Rôle name: {}", roleData.get("name"));

            // 2. Préparer la liste des rôles à assigner
            List<Map<String, Object>> rolesToAssign = List.of(roleData);
            log.info("📋 Rôles à assigner: {}", rolesToAssign);

            // 3. Assigner le rôle à l'utilisateur
            String assignRoleUrl = keycloakUrl + "/admin/realms/" + realm
                    + "/users/" + userId + "/role-mappings/realm";
            log.info("📡 POST assign role URL: {}", assignRoleUrl);

            HttpEntity<List<Map<String, Object>>> assignRequest = new HttpEntity<>(rolesToAssign, headers);

            ResponseEntity<String> assignResp = restTemplate.exchange(
                    assignRoleUrl,
                    HttpMethod.POST,
                    assignRequest,
                    String.class
            );

            log.info("📡 Réponse POST assign: status={}", assignResp.getStatusCode());

            if (!(assignResp.getStatusCode() == HttpStatus.NO_CONTENT ||
                    assignResp.getStatusCode() == HttpStatus.OK ||
                    assignResp.getStatusCode() == HttpStatus.CREATED)) {
                log.error("❌ Échec assignation: status={}, body={}",
                        assignResp.getStatusCodeValue(), assignResp.getBody());
                throw new RuntimeException("Échec assignation rôle: " + assignResp.getStatusCodeValue());
            }

            log.info("✅ Rôle '{}' assigné avec SUCCÈS à l'utilisateur {}", roleName, userId);
            log.info("🔍 === FIN assignRoleToUser ===");

        } catch (HttpClientErrorException e) {
            log.error("❌ Erreur HTTP assignation rôle: status={}, body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            log.error("❌ Exception détaillée:", e);
            throw new RuntimeException("Impossible d'assigner le rôle: " + e.getResponseBodyAsString(), e);

        } catch (Exception e) {
            log.error("❌ Erreur assignation rôle: {}", e.getMessage(), e);
            throw new RuntimeException("Impossible d'assigner le rôle: " + e.getMessage(), e);
        }
    }

    /**
     * Authentifier un utilisateur
     */
    public Map<String, Object> authenticateUser(String email, String password) {
        try {
            String url = keycloakUrl + "/realms/" + realm + "/protocol/openid-connect/token";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("client_id", clientId);
            body.add("client_secret", clientSecret);
            body.add("grant_type", "password");
            body.add("username", email);
            body.add("password", password);

            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    request,
                    Map.class
            );

            log.info("✅ Authentification réussie pour: {}", email);
            return response.getBody();

        } catch (HttpClientErrorException e) {
            log.error("❌ Erreur authentification: status={}, body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Identifiants invalides: " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            log.error("❌ Erreur authentification: {}", e.getMessage());
            throw new RuntimeException("Identifiants invalides", e);
        }
    }

    /**
     * Obtenir un token admin
     */
    private String getAdminToken() {
        try {
            String url = keycloakUrl + "/realms/master/protocol/openid-connect/token";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("client_id", "admin-cli");
            body.add("grant_type", "password");
            body.add("username", "admin");
            body.add("password", "admin123");

            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    request,
                    Map.class
            );

            if (response.getStatusCode() != HttpStatus.OK ||
                    response.getBody() == null ||
                    response.getBody().get("access_token") == null) {
                log.error("❌ Token admin échoué: status={}, body={}",
                        response.getStatusCodeValue(), response.getBody());
                throw new RuntimeException("Impossible d'obtenir le token admin");
            }

            return (String) response.getBody().get("access_token");

        } catch (HttpClientErrorException e) {
            log.error("❌ Erreur HTTP token admin: status={}, body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Impossible d'obtenir le token admin: " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            log.error("❌ Erreur token admin: {}", e.getMessage());
            throw new RuntimeException("Impossible d'obtenir le token admin", e);
        }
    }

    /**
     * Rafraîchir un token
     */
    public Map<String, Object> refreshToken(String refreshToken) {
        try {
            String url = keycloakUrl + "/realms/" + realm + "/protocol/openid-connect/token";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("client_id", clientId);
            body.add("client_secret", clientSecret);
            body.add("grant_type", "refresh_token");
            body.add("refresh_token", refreshToken);

            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    request,
                    Map.class
            );

            return response.getBody();

        } catch (Exception e) {
            log.error("❌ Erreur refresh token: {}", e.getMessage());
            throw new RuntimeException("Impossible de rafraîchir le token", e);
        }
    }
    /**
     * Mettre à jour le mot de passe d'un utilisateur dans Keycloak
     */
    public void updateUserPassword(String keycloakId, String newPassword) {
        log.info("Mise à jour du mot de passe Keycloak pour l'utilisateur: {}", keycloakId);

        try {
            String url = keycloakUrl + "/admin/realms/" + realm + "/users/" + keycloakId + "/reset-password";

            // Créer le body avec le nouveau mot de passe
            Map<String, Object> passwordCredential = Map.of(
                    "type", "password",
                    "value", newPassword,
                    "temporary", false  // Pas de changement forcé au prochain login
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + getAdminToken());

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(passwordCredential, headers);

            // PUT request pour mettre à jour le mot de passe
            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.PUT,
                    request,
                    String.class
            );

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("✅ Mot de passe mis à jour dans Keycloak");
            } else {
                log.error("❌ Erreur mise à jour mot de passe: {}", response.getStatusCode());
                throw new RuntimeException("Erreur lors de la mise à jour du mot de passe");
            }

        } catch (Exception e) {
            log.error("❌ Exception lors de la mise à jour du mot de passe: {}", e.getMessage());
            throw new RuntimeException("Erreur lors de la mise à jour du mot de passe: " + e.getMessage());
        }
    }

    /**
     * Invalider la session Keycloak via le refresh token
     */
    public void logoutUser(String refreshToken) {
        try {
            String url = keycloakUrl + "/realms/" + realm + "/protocol/openid-connect/logout";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("client_id", clientId);
            body.add("client_secret", clientSecret);
            body.add("refresh_token", refreshToken);

            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    request,
                    String.class
            );

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("✅ Session Keycloak invalidée avec succès");
            } else {
                log.warn("⚠️ Réponse inattendue de Keycloak lors du logout: {}", response.getStatusCode());
            }

        } catch (HttpClientErrorException e) {
            // 400 = refresh token déjà expiré ou invalide → OK, on considère déjà déconnecté
            if (e.getStatusCode().value() == 400) {
                log.info("ℹ️ Refresh token déjà expiré ou invalide, session considérée terminée");
            } else {
                log.error("❌ Erreur HTTP lors du logout Keycloak: status={}, body={}",
                        e.getStatusCode(), e.getResponseBodyAsString());
                throw new RuntimeException("Erreur lors de la déconnexion: " + e.getResponseBodyAsString(), e);
            }
        } catch (Exception e) {
            log.error("❌ Erreur lors du logout Keycloak: {}", e.getMessage());
            throw new RuntimeException("Erreur lors de la déconnexion", e);
        }
    }
}