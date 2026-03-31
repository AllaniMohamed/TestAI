package com.testai.endpointservice.feignclient;

import com.testai.endpointservice.config.FeignClientConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.Map;
import java.util.UUID;

@FeignClient(name = "test-service", url = "/api/tests", configuration = FeignClientConfig.class)
public interface TestClient {
    @DeleteMapping("/{projectId}")
    Map<String, String> deleteTestsByProjectId(@PathVariable UUID projectId);

    @DeleteMapping("/{projectId}/{endpointId}")
    Map<String, String> deleteTestsByProjectIdAndEndpointId(@PathVariable UUID projectId, @PathVariable UUID endpointId);
}
