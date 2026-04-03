package org.example.executionservice.feignclient;


import org.example.executionservice.config.feignConfiguration;
import org.example.executionservice.dto.TestDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import java.util.UUID;

@FeignClient(name = "test-service", path = "/api/tests", configuration = feignConfiguration.class)
public interface TestServiceClient {

    @GetMapping("/{projectId}/{endpointId}")
    TestDTO getTestsByProjectIdAndEndpointId(
            @PathVariable UUID projectId,
            @PathVariable UUID endpointId
    );
}