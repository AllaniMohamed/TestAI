package org.example.userservice.repository;

import org.example.userservice.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository pour l'entité User
 */
@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    /**
     * Trouver un utilisateur par email
     */
    Optional<User> findByEmail(String email);

    /**
     * Vérifier si un email existe
     */
    boolean existsByEmail(String email);

    /**
     * Trouver un utilisateur par son ID Keycloak
     */
    Optional<User> findByKeycloakId(String keycloakId);

    /**
     * Trouver un utilisateur par son token de vérification email
     */
    Optional<User> findByEmailVerificationToken(String token);

    /**
     * Trouver un utilisateur par son numéro de téléphone
     */
    Optional<User> findByPhoneNumber(String phoneNumber);

    /**
     * Trouver un utilisateur par son token de réinitialisation de mot de passe
     */
    Optional<User> findByPasswordResetToken(String token);

    Optional<User> findById(UUID id);

}