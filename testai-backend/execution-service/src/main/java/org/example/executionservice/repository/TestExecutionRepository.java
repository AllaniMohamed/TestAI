package org.example.executionservice.repository;

import jakarta.transaction.Transactional;
import org.example.executionservice.dto.TestStatisticsDTO;
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

    @Query("SELECT t.status as status,COUNT(t) as count FROM TestExecution t WHERE t.projectId = :projectId GROUP BY t.status")
    List<TestStatisticsDTO.TestStatusCount> findTestSuccessRate(@Param("projectId") UUID projectId);

    @Query(value = """
        WITH last_test_days AS (
            SELECT DISTINCT DATE(executed_at) AS test_day
            FROM test_executions
            WHERE project_id = :projectId
            ORDER BY test_day DESC
            LIMIT 7
        )
        SELECT 
            DATE(te.executed_at) AS executed_at,
            COUNT(*) FILTER (WHERE te.status = 'SUCCESS') AS success_count,
            COUNT(*) AS total_count
        FROM test_executions te
        JOIN last_test_days ltd 
            ON DATE(te.executed_at) = ltd.test_day
        WHERE te.project_id = :projectId
        GROUP BY DATE(te.executed_at)
        ORDER BY DATE(te.executed_at) DESC
        """, nativeQuery = true)
    List<TestStatisticsDTO.TestStatusHistory> findTestSuccessRateHistory(@Param("projectId") UUID projectId);

    long countAllByProjectId(UUID projectId);

    long countAllByProjectIdAndStatus(UUID projectId, TestExecution.TestStatus status);
}