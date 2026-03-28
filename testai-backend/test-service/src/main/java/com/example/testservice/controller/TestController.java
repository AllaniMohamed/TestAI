package com.example.testservice.controller;
import com.example.testservice.dto.*;
import com.example.testservice.entity.Test;
import com.example.testservice.feignclient.GenerateTestClient;
import com.example.testservice.service.TestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/tests")
public class TestController {
    @Autowired
    private TestService testService;
    @Autowired
    private GenerateTestClient generateTestClient;

    @PostMapping("/generate")
    public ResponseEntity<List<TestResponse>> generateTests(@RequestBody List<EndpointDTO> endpoints){
        List<TestResponse> response = testService.generateTests(endpoints);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<Test>> getAllTests(){
        return ResponseEntity.ok(testService.getAllTests());
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<List<Test>> getAllTestsByProjectId(@PathVariable UUID projectId){
        return ResponseEntity.ok(testService.getAllTestsByProjectId(projectId));
    }

    @GetMapping("/headers")
    public ResponseEntity<Map<String, Object>> getHeaders(){
        return ResponseEntity.ok(generateTestClient.getHeaders());
    }

    @PostMapping("/headers")
    public ResponseEntity<Map<String, Object>> setHeaders(@RequestBody Map<String, Object> newHeaders){
        return ResponseEntity.ok(generateTestClient.setHeaders(newHeaders));
    }

    @GetMapping("reset_headers")
    public ResponseEntity<Map<String, Object>> resetHeaders(){
        return ResponseEntity.ok(generateTestClient.resetHeaders());
    }
}
