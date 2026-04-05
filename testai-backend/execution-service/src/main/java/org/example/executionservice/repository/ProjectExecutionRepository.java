package org.example.executionservice.repository;

import org.example.executionservice.entity.ProjectExecution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProjectExecutionRepository extends JpaRepository<ProjectExecution, UUID> {

    /**
     * Récupérer toutes les exécutions d'un projet, ordonnées par date (plus récent en premier)
     */
    List<ProjectExecution> findByProjectIdOrderByExecutedAtDesc(UUID projectId);

    /**
     * Récupérer toutes les exécutions d'un projet
     */
    List<ProjectExecution> findByProjectId(UUID projectId);

    /**
     * Compter les exécutions d'un projet
     */
    Long countByProjectId(UUID projectId);
}