package com.testai.projectservice.feignclient;

import com.testai.projectservice.config.FeignClientConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.Map;
import java.util.UUID;

/**
 * Feign Client pour communiquer avec execution-service
 */
@FeignClient(name = "execution-service", path = "/api/executions", configuration = FeignClientConfig.class)
public interface ExecutionServiceClient {

    /**
     * Supprimer toutes les exécutions (ProjectExecution + TestExecution) d'un projet
     * DELETE /api/executions/project/{projectId}
     */
    @DeleteMapping("/project/{projectId}")
    Map<String, String> deleteExecutionsByProjectId(@PathVariable("projectId") UUID projectId);
}