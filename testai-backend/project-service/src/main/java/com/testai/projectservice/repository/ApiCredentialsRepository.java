package com.testai.projectservice.repository;

import com.testai.projectservice.entity.ApiCredentials;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface ApiCredentialsRepository extends JpaRepository<ApiCredentials, UUID> {
    Optional<ApiCredentials> findByProjectId(UUID projectId);
}