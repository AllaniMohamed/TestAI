package org.example.userservice.FeignClient;

import org.example.userservice.config.FeignClientConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.UUID;

@FeignClient(name = "project-service", path = "/api/projects",configuration = FeignClientConfig.class)
public interface ProjectServiceClient {
    @PutMapping("/shared-access/link")
    void linkSharedAccess(@RequestParam("email") String email, @RequestParam("userId") UUID userId);
}