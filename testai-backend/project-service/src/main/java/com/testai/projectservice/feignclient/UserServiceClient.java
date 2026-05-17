package com.testai.projectservice.feignclient;

import com.testai.projectservice.config.FeignClientConfig;
import com.testai.projectservice.dto.SendShareInvitationRequest;
import com.testai.projectservice.dto.UserDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Feign Client pour communiquer avec user-service
 *
 * @FeignClient:
 * - name: nom du service dans Eureka (USER-SERVICE)
 * - path: préfixe des endpoints (/api/users)
 */
@FeignClient(name = "user-service", configuration = FeignClientConfig.class)
public interface UserServiceClient {

    /**
     * Récupérer un utilisateur par son ID
     *
     * Appelle : GET http://user-service/api/users/{id}
     *
     * @param userId UUID de l'utilisateur
     * @return UserDTO ou exception si non trouvé
     */
    @GetMapping("/api/users/{id}")
    UserDTO getUserById(@PathVariable("id") UUID userId);


    @GetMapping("/api/users/{userId}")
    UserDTO getUserById(
            @PathVariable("userId") UUID userId,
            @RequestHeader("Authorization") String token
    );

    @GetMapping("/api/users/email/{email}")
    UserDTO getUserByEmail(
            @PathVariable("email") String email,
            @RequestHeader("Authorization") String token
    );
    @GetMapping("/api/users/email/{email}/public")
    UserDTO getUserByEmailPublic(@PathVariable("email") String email);

    @PostMapping("/api/email/share-invitation")
    void sendShareInvitation(
            @RequestBody SendShareInvitationRequest request,
            @RequestHeader("Authorization") String token
    );
    // UserServiceClient.java — ajouter une méthode sans header Authorization
    @GetMapping("/api/users/{userId}/public")
    UserDTO getUserByIdPublic(@PathVariable("userId") UUID userId);
}