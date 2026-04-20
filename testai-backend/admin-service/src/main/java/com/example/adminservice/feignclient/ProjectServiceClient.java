package com.example.adminservice.feignclient;

import com.example.adminservice.config.feignConfiguration;
import com.example.adminservice.dto.ProjectEntity;
import com.example.adminservice.dto.SharedAccessDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@FeignClient(name = "project-service", path = "/api/projects", configuration = feignConfiguration.class)
public interface ProjectServiceClient {
    @GetMapping("/{projectId}/shares")
    List<SharedAccessDTO> getProjectShares(@PathVariable UUID projectId);

    @GetMapping("/{userId}/projectIds")
    Set<UUID> getUserProjects(@PathVariable UUID userId);

    @GetMapping("/{id}")
    ProjectEntity getProjectById(@PathVariable UUID id);

    @DeleteMapping("/{id}")
    Map<?,?> deleteProjectById(@PathVariable UUID id);
}
