package com.testai.projectservice.repository;

import com.testai.projectservice.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProjectRepository extends JpaRepository<Project, UUID> {
    List<Project> findByAuthType(Project.AuthType authType);

    List<Project> findByDocMode(Project.DocsMode docMode);

    @Query("SELECT p.id FROM Project p WHERE p.userId = :userId")
    List<UUID> findUserProjects(@Param("userId") UUID userId);
}
