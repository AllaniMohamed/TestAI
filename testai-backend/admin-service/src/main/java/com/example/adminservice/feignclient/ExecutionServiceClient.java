package com.example.adminservice.feignclient;

import com.example.adminservice.config.feignConfiguration;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@FeignClient(name = "execution-service", path = "/api", configuration = feignConfiguration.class)
public interface ExecutionServiceClient {
    @GetMapping("/stats/{userId}/execution-global-stats")
    Map<String, Long> getUserProjectsGlobalStats(@PathVariable UUID userId);

    @GetMapping("/stats/{userId}/global-tests-rate")
    Map<String, Map<String, Long>> getUserProjectsGlobalTestsRate(@PathVariable UUID userId);

    @GetMapping("/stats/{userId}/latest-project-execs")
    List<Map<String, String>> getUserProjectsLatestExecs(@PathVariable UUID userId);

    @GetMapping(value = "/executions/report/{projectId}", produces = MediaType.APPLICATION_PDF_VALUE)
    ResponseEntity<byte[]> generateProjectFullReport(@PathVariable UUID projectId);

    @GetMapping(value = "/executions/report/{projectId}/simple", produces = MediaType.APPLICATION_PDF_VALUE)
    ResponseEntity<byte[]> generateProjectSimpleReport(@PathVariable UUID projectId);
}
