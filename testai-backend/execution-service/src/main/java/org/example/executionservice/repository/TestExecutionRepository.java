package org.example.executionservice.repository;

import org.example.executionservice.entity.TestExecution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TestExecutionRepository extends JpaRepository<TestExecution, UUID> {

    /**
     * Récupérer tous les tests d'un projet
     */
    List<TestExecution> findByProjectId(UUID projectId);

    /**
     * Récupérer tous les tests d'un endpoint
     */
    List<TestExecution> findByEndpointId(UUID endpointId);

    /**
     * ⭐ IMPORTANT : Récupérer tous les tests d'une exécution de projet
     */
    List<TestExecution> findByExecutionId(UUID executionId);

    /**
     * Récupérer tous les tests d'une exécution de projet, ordonnés par date
     */
    List<TestExecution> findByExecutionIdOrderByExecutedAtDesc(UUID executionId);
}