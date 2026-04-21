package com.example.adminservice.feignclient;

import com.example.adminservice.config.feignConfiguration;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.Map;

@FeignClient(name = "api-gateway", path = "/actuator", configuration = feignConfiguration.class)
public interface ActuatorClient {
    @GetMapping("/health")
    Map<String, Object> getHealth();
}
