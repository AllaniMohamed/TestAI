package com.example.testservice.feignclient;

import com.example.testservice.config.FeignClientConfig;
import com.example.testservice.dto.EndpointDTO;
import com.example.testservice.dto.GenerateTestResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;
import java.util.Map;

@FeignClient(name = "ai-service", url = "http://ai-service:8084", configuration = FeignClientConfig.class)
public interface GenerateTestClient {
    @PostMapping("/generate_tests")
    List<GenerateTestResponse> generateTests(@RequestBody List<EndpointDTO> requests);

    @GetMapping("/get_headers")
    Map<String, Object> getHeaders();

    @PostMapping("/set_headers")
    Map<String, Object> setHeaders(@RequestBody Map<String, Object> newHeaders);

    @GetMapping("/reset_headers")
    Map<String, Object> resetHeaders();
}
