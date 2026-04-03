package org.example.executionservice.feignclient;


import org.example.executionservice.config.feignConfiguration;
import org.example.executionservice.dto.ProjectDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import java.util.UUID;

@FeignClient(name = "project-service", path = "/api/projects", configuration = feignConfiguration.class)
public interface ProjectServiceClient {

    @GetMapping("/{projectId}")
    ProjectDTO getProjectById(@PathVariable UUID projectId);
}