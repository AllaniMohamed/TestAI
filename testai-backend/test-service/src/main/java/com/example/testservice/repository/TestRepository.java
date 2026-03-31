package com.example.testservice.repository;

import com.example.testservice.entity.Test;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TestRepository extends JpaRepository<Test, UUID> {
    Optional<Test> findByProjectIdAndEndpointId(UUID projectId, UUID endpointId);
    Optional<List<Test>> findAllByProjectId(UUID projectId);
    void deleteByProjectId(UUID projectId);
    void deleteByProjectIdAndEndpointId(UUID projectId, UUID endpointId);
}
