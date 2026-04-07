package com.testai.projectservice.feignclient;

import com.testai.projectservice.config.FeignClientConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.Map;
import java.util.UUID;

/**
 * Feign Client pour communiquer avec test-service
 */
@FeignClient(name = "test-service", path = "/api/tests", configuration = FeignClientConfig.class)
public interface TestServiceClient {

    /**
     * Supprimer tous les tests d'un projet
     * DELETE /api/tests/{projectId}
     */
    @DeleteMapping("/{projectId}")
    Map<String, String> deleteTestsByProjectId(@PathVariable("projectId") UUID projectId);
}