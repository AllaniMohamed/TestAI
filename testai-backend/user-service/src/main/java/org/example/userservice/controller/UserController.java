package org.example.userservice.controller;


import org.example.userservice.dto.UserDTO;
import org.example.userservice.entity.User;
import org.example.userservice.service.FileStorageService;
import org.example.userservice.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserService userService;
    private final FileStorageService fileStorageService;


    /**
     * Récupérer un utilisateur par ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserDTO> getUserById(@PathVariable UUID id) {
        log.info("Récupération de l'utilisateur: {}", id);
        UserDTO user = userService.getUserById(id);
        return ResponseEntity.ok(user);
    }

    /**
     * Récupérer un utilisateur par email
     */
    @GetMapping("/email/{email}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserDTO> getUserByEmail(@PathVariable String email) {
        log.info("Récupération de l'utilisateur par email: {}", email);
        UserDTO user = userService.getUserByEmail(email);
        return ResponseEntity.ok(user);
    }

    /**
     * ⭐ NOUVEAU : Upload avatar
     */
    @PostMapping("/{id}/avatar")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> uploadAvatar(
            @PathVariable UUID id,
            @RequestParam("avatar") MultipartFile file) {
        try {
            log.info("📸 Upload avatar pour l'utilisateur: {}", id);

            UserDTO updatedUser = userService.uploadAvatar(id, file);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Avatar mis à jour avec succès",
                    "user", updatedUser
            ));

        } catch (Exception e) {
            log.error("❌ Erreur upload avatar: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * ⭐ NOUVEAU : Servir les avatars (accès public)
     */
    @GetMapping("/avatars/{fileName:.+}")
    public ResponseEntity<Resource> getAvatar(
            @PathVariable String fileName,
            HttpServletRequest request) {
        try {
            // Charger le fichier comme ressource
            Resource resource = fileStorageService.loadFileAsResource(fileName);

            // Déterminer le type de contenu
            String contentType = null;
            try {
                contentType = request.getServletContext().getMimeType(resource.getFile().getAbsolutePath());
            } catch (IOException ex) {
                log.info("⚠️ Impossible de déterminer le type de fichier");
            }

            // Fallback au type par défaut
            if (contentType == null) {
                contentType = "application/octet-stream";
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "inline; filename=\"" + resource.getFilename() + "\"")
                    .body(resource);

        } catch (Exception e) {
            log.error("❌ Erreur chargement avatar: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * ⭐ NOUVEAU : Supprimer l'avatar
     */
    @DeleteMapping("/{id}/avatar")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> deleteAvatar(@PathVariable UUID id) {
        try {
            log.info("🗑️ Suppression avatar pour l'utilisateur: {}", id);

            UserDTO updatedUser = userService.deleteAvatar(id);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Avatar supprimé avec succès",
                    "user", updatedUser
            ));

        } catch (Exception e) {
            log.error("❌ Erreur suppression avatar: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * ⭐ MODIFIÉ : Mettre à jour un utilisateur (SANS avatar)
     * L'avatar est géré via uploadAvatar()
     */
    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserDTO> updateUser(
            @PathVariable UUID id,
            @RequestBody UserDTO userDTO) {
        log.info("Mise à jour de l'utilisateur: {}", id);

        UserDTO updatedUser = userService.updateUser(id, userDTO);
        return ResponseEntity.ok(updatedUser);
    }

    @PostMapping("/{userId}/toggle")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<Map<String, String>> setActive(@PathVariable UUID userId){
        Map<String, String> message = new HashMap<>();
        try{
            UserDTO userDTO = userService.getUserById(userId);
            userDTO.setIsActive(!userDTO.getIsActive());
            userService.updateUser(userId, userDTO);
            message.put("success", "User " + userDTO.getName() + " is "
                    + (userDTO.getIsActive() ? "activated" : "deactivated") + " successfully!!");
            return ResponseEntity.ok(message);
        } catch (Exception e) {
            message.put("error",e.toString());
            return ResponseEntity.badRequest().body(message);
        }
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserDTO>> getAllUsers(){
        try{
            return ResponseEntity.ok(userService.getAllUsers());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ArrayList<>());
        }
    }

    @GetMapping("/{id}/full")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getFullUserById(@PathVariable UUID id){
        try{
            return ResponseEntity.ok(userService.getFullUserById(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.toString()) ;
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteUserById(@PathVariable UUID id){
        try{
            return ResponseEntity.ok(userService.deleteUserById(id));
        } catch (Exception e) {
            Map<String, String> map = new HashMap<>();
            map.put("failed", e.toString());
            return ResponseEntity.badRequest().body(map);
        }
    }
    // APRÈS (correct)
    @GetMapping("/{id}/public")
    public ResponseEntity<UserDTO> getUserByIdPublic(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @GetMapping("/email/{email}/public")
    public ResponseEntity<UserDTO> getUserByEmailPublic(@PathVariable String email) {
        return ResponseEntity.ok(userService.getUserByEmail(email));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody Map<String, String> request) {
        String refreshToken = request.get("refreshToken");

        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Refresh token requis"
            ));
        }

        try {
            userService.logout(refreshToken);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "✅ Déconnexion réussie"
            ));
        } catch (Exception e) {
            log.error("Erreur lors du logout: {}", e.getMessage());
            // On retourne quand même 200 : côté client on nettoie le storage dans tous les cas
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Déconnexion effectuée"
            ));
        }
    }
}
