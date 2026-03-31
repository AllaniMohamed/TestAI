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

    @GetMapping("/{projectId}/{endpointId}")
    public ResponseEntity<Test> getTestsByProjectIdAndEndpointId(@PathVariable UUID projectId, @PathVariable UUID endpointId){
        Test test = testService.getTestsByProjectIdAndEndpointId(projectId, endpointId);
        return ResponseEntity.ok(test);
    }

    @PutMapping("/update")
    public ResponseEntity<String> updateTest(@RequestBody Test newTest){
        Test response = testService.updateTest(newTest);
        if(response != null){
            return ResponseEntity.ok("Tests for endpoint " + response.getEndpointPath() + " updated");
        }
        else{
            return ResponseEntity.badRequest().body("Tests not found to update");
        }
    }

    @DeleteMapping("/{projectId}")
    public ResponseEntity<Map<String, String>> deleteByProjectId(@PathVariable UUID projectId){
        Map<String, String> response = testService.deleteByProjectId(projectId);
        if(response.containsKey("success")){
            return ResponseEntity.ok(response);
        }
        else{
            return ResponseEntity.badRequest().body(response);
        }
    }

    @DeleteMapping("/{projectId}/{endpointId}")
    public ResponseEntity<Map<String, String>> deleteByProjectIdAndEndpointId(@PathVariable UUID projectId, @PathVariable UUID endpointId){
        Map<String, String> response = testService.deleteByProjectIdAndEndpointId(projectId, endpointId);
        if(response.containsKey("success")){
            return ResponseEntity.ok(response);
        }
        else{
            return ResponseEntity.badRequest().body(response);
        }
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
