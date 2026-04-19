package com.example.adminservice.feignclient;

import com.example.adminservice.config.feignConfiguration;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@FeignClient(name = "execution-service", url = "http://localhost:8086/api/stats", configuration = feignConfiguration.class)
public interface StatsControllerClient {
    @GetMapping("/{userId}/execution-global-stats")
    Map<String, Long> getUserProjectsGlobalStats(@PathVariable UUID userId);

    @GetMapping("/{userId}/global-tests-rate")
    Map<String, Map<String, Long>> getUserProjectsGlobalTestsRate(@PathVariable UUID userId);

    @GetMapping("/{userId}/latest-project-execs")
    List<Map<String, String>> getUserProjectsLatestExecs(@PathVariable UUID userId);
}
