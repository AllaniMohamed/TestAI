package org.example.executionservice.repository;

import org.example.executionservice.entity.TestExecution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TestExecutionRepository extends JpaRepository<TestExecution, UUID> {
    List<TestExecution> findByProjectId(UUID projectId);
    List<TestExecution> findByEndpointId(UUID endpointId);
    List<TestExecution> findByExecutionId(UUID executionId);

}