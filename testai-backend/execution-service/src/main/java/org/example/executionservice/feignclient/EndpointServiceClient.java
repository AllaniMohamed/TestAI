package org.example.executionservice.feignclient;


import org.example.executionservice.config.feignConfiguration;
import org.example.executionservice.dto.EndpointDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;
import java.util.UUID;


@FeignClient(name = "endpoint-service", path = "/api/endpoints", configuration = feignConfiguration.class)
public interface EndpointServiceClient {

    @GetMapping("/{endpointId}")
    EndpointDTO getEndpointById(@PathVariable UUID endpointId);
    @GetMapping("/project/{projectId}")
    List<EndpointDTO> getEndpointsByProjectId(@PathVariable UUID projectId);
}