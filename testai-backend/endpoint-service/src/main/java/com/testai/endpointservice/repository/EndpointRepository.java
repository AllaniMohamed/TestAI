package com.testai.endpointservice.repository;

import com.testai.endpointservice.entity.Endpoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository pour gérer les endpoints
 */
@Repository
public interface EndpointRepository extends JpaRepository<Endpoint, UUID> {

    /**
     * Récupérer tous les endpoints d'un projet
     */
    List<Endpoint> findByProjectId(UUID projectId);

    /**
     * Récupérer les endpoints par méthode HTTP
     */
    List<Endpoint> findByMethod(Endpoint.HttpMethod method);

    /**
     * Récupérer les endpoints par type de découverte
     */
    List<Endpoint> findByDiscoveryType(Endpoint.DiscoveryType discoveryType);

    /**
     * Récupérer les endpoints d'un projet par méthode
     */
    List<Endpoint> findByProjectIdAndMethod(UUID projectId, Endpoint.HttpMethod method);

    /**
     * Vérifier si un endpoint existe déjà (pour éviter les doublons)
     */
    boolean existsByProjectIdAndMethodAndPath(UUID projectId, Endpoint.HttpMethod method, String path);

    /**
     * Supprimer tous les endpoints d'un projet
     */
    void deleteByProjectId(UUID projectId);

    /**
     * Compter les endpoints d'un projet
     */
    long countByProjectId(UUID projectId);

    @Query("SELECT DISTINCT e.tags FROM Endpoint e WHERE e.projectId = :projectId AND e.tags IS NOT NULL")
    List<String> findDistinctTagsByProjectId(@Param("projectId") UUID projectId);

    List<Endpoint> findByProjectIdAndTagsContaining(UUID projectId, String tag);
}