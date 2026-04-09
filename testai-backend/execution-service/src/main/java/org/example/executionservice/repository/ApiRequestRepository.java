package org.example.executionservice.repository;

import org.example.executionservice.entity.ApiRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ApiRequestRepository extends JpaRepository<ApiRequest, UUID> {

    /**
     * Trouver toutes les requêtes d'un utilisateur
     * Ordonné par date de dernière exécution décroissante
     */
    List<ApiRequest> findByUserIdOrderByLastExecutedAtDesc(UUID userId);

    /**
     * Trouver toutes les requêtes d'un utilisateur
     * Ordonné par date de création décroissante
     */
    List<ApiRequest> findByUserIdOrderByCreatedAtDesc(UUID userId);

    /**
     * Compter les requêtes d'un utilisateur
     */
    long countByUserId(UUID userId);
}