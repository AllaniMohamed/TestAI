package org.example.executionservice.repository;

import jakarta.transaction.Transactional;
import org.example.executionservice.entity.TestExecution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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
    @Transactional
    int deleteByProjectId(UUID projectId);

    @Query("SELECT DISTINCT t.endpointId FROM TestExecution t WHERE t.projectId = :projectId")
    List<UUID> findDistinctEndpointIdByProjectId(@Param("projectId") UUID projectId);
}