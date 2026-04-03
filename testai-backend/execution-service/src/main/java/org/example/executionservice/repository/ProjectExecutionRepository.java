package org.example.executionservice.repository;

import org.example.executionservice.entity.ProjectExecution;
import org.example.executionservice.entity.TestExecution;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProjectExecutionRepository extends JpaRepository<ProjectExecution, UUID> {
    List<ProjectExecution> findByProjectIdOrderByExecutedAtDesc(UUID projectId);

}